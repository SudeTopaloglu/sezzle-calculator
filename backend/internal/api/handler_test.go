package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestServer(t *testing.T, staticDir string) http.Handler {
	t.Helper()
	return NewRouter(slog.New(slog.NewTextHandler(io.Discard, nil)), staticDir)
}

func serve(t *testing.T, handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

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
		{"percentage", "/api/v1/percentage", `{"a": 25}`, `{"operation":"percentage","a":25,"result":0.25}`},
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
		{"extra operand for unary operation", "/api/v1/sqrt", `{"a": 4, "b": 2}`, http.StatusBadRequest, "INVALID_REQUEST", "single operand"},
	}

	server := newTestServer(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, server, http.MethodPost, tt.path, tt.body)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			var got errorResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response is not a JSON error: %v (body: %s)", err, rec.Body)
			}
			if got.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", got.Error.Code, tt.wantCode)
			}
			if !strings.Contains(got.Error.Message, tt.wantMessage) {
				t.Errorf("message = %q, want it to contain %q", got.Error.Message, tt.wantMessage)
			}
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	rec := serve(t, newTestServer(t, ""), http.MethodGet, "/api/v1/add", "")

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}

func TestHealth(t *testing.T) {
	rec := serve(t, newTestServer(t, ""), http.MethodGet, "/healthz", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got, want := strings.TrimSpace(rec.Body.String()), `{"status":"ok"}`; got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestServesStaticFiles(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>calculator</h1>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := newTestServer(t, dir)

	rec := serve(t, server, http.MethodGet, "/", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "<h1>calculator</h1>") {
		t.Errorf("GET / = %d %q, want the index page", rec.Code, rec.Body)
	}

	rec = serve(t, server, http.MethodPost, "/api/v1/add", `{"a": 1, "b": 1}`)
	if rec.Code != http.StatusOK {
		t.Errorf("API status with static files enabled = %d, want %d", rec.Code, http.StatusOK)
	}
}
