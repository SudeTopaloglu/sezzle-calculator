package api

import (
	"net/http"
	"strings"
	"testing"
)

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		body     string
		wantBody string
	}{
		{"add", "/api/v1/add", `{"a": 2, "b": 3}`, `{"operation":"add","a":2,"b":3,"result":5}`},
		{"subtract", "/api/v1/subtract", `{"a": 2, "b": 3.5}`, `{"operation":"subtract","a":2,"b":3.5,"result":-1.5}`},
		{"multiply", "/api/v1/multiply", `{"a": -4, "b": 2.5}`, `{"operation":"multiply","a":-4,"b":2.5,"result":-10}`},
		{"divide", "/api/v1/divide", `{"a": 1, "b": 4}`, `{"operation":"divide","a":1,"b":4,"result":0.25}`},
		{"zero operand is accepted", "/api/v1/add", `{"a": 0, "b": 0}`, `{"operation":"add","a":0,"b":0,"result":0}`},
		{"power", "/api/v1/power", `{"a": 2, "b": 8}`, `{"operation":"power","a":2,"b":8,"result":256}`},
		{"sqrt omits b", "/api/v1/sqrt", `{"a": 81}`, `{"operation":"sqrt","a":81,"result":9}`},
		{"percentage", "/api/v1/percentage", `{"a": 25, "b": 80}`, `{"operation":"percentage","a":25,"b":80,"result":20}`},
		{"exponent notation", "/api/v1/multiply", `{"a": 1e20, "b": 1e20}`, `{"operation":"multiply","a":100000000000000000000,"b":100000000000000000000,"result":1e+40}`},
	}

	server := newTestServer(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, server, http.MethodPost, tt.path, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", got)
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tt.wantBody {
				t.Errorf("body = %s, want %s", got, tt.wantBody)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		body        string
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		{"unknown operation", "/api/v1/modulo", `{"a": 1, "b": 2}`, http.StatusNotFound, "UNKNOWN_OPERATION", "supported operations: add, divide"},
		{"division by zero", "/api/v1/divide", `{"a": 1, "b": 0}`, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO", "division by zero"},
		{"negative square root", "/api/v1/sqrt", `{"a": -9}`, http.StatusUnprocessableEntity, "NEGATIVE_SQUARE_ROOT", "negative number"},
		{"non-real power", "/api/v1/power", `{"a": -8, "b": 0.5}`, http.StatusUnprocessableEntity, "UNDEFINED_RESULT", "not a real number"},
		{"overflow", "/api/v1/power", `{"a": 10, "b": 400}`, http.StatusUnprocessableEntity, "RESULT_OUT_OF_RANGE", "too large"},
		{"empty body", "/api/v1/add", ``, http.StatusBadRequest, "INVALID_REQUEST", "must not be empty"},
		{"malformed JSON", "/api/v1/add", `{"a": 1,`, http.StatusBadRequest, "INVALID_REQUEST", "valid JSON"},
		{"invalid JSON syntax", "/api/v1/add", `{"a": one}`, http.StatusBadRequest, "INVALID_REQUEST", "valid JSON"},
		{"string operand", "/api/v1/add", `{"a": "1", "b": 2}`, http.StatusBadRequest, "INVALID_REQUEST", `field "a" must be a valid number`},
		{"number out of float64 range", "/api/v1/add", `{"a": 1, "b": 1e400}`, http.StatusBadRequest, "INVALID_REQUEST", `field "b" must be a valid number`},
		{"array body", "/api/v1/add", `[1, 2]`, http.StatusBadRequest, "INVALID_REQUEST", "must be a JSON object"},
		{"unknown field", "/api/v1/add", `{"a": 1, "c": 2}`, http.StatusBadRequest, "INVALID_REQUEST", `unknown field "c"`},
		{"multiple JSON values", "/api/v1/add", `{"a": 1, "b": 2}{"a": 3}`, http.StatusBadRequest, "INVALID_REQUEST", "single JSON object"},
		{"body too large", "/api/v1/add", `{"a": 1, "b": 2` + strings.Repeat(" ", maxBodyBytes) + `}`, http.StatusBadRequest, "INVALID_REQUEST", "must not exceed"},
		{"missing a", "/api/v1/add", `{"b": 2}`, http.StatusBadRequest, "INVALID_REQUEST", `operand "a" is required`},
		{"null body", "/api/v1/sqrt", `null`, http.StatusBadRequest, "INVALID_REQUEST", `operand "a" is required`},
		{"missing b", "/api/v1/divide", `{"a": 2}`, http.StatusBadRequest, "INVALID_REQUEST", `operand "b" is required`},
		{"null b", "/api/v1/divide", `{"a": 2, "b": null}`, http.StatusBadRequest, "INVALID_REQUEST", `operand "b" is required`},
		{"percentage without b", "/api/v1/percentage", `{"a": 10}`, http.StatusBadRequest, "INVALID_REQUEST", `operand "b" is required`},
		{"extra operand for unary operation", "/api/v1/sqrt", `{"a": 4, "b": 2}`, http.StatusBadRequest, "INVALID_REQUEST", "single operand"},
	}

	server := newTestServer(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, server, http.MethodPost, tt.path, tt.body)

			assertError(t, rec, tt.wantStatus, tt.wantCode, tt.wantMessage)
		})
	}
}
