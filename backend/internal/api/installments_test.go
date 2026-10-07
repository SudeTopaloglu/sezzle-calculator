package api

import (
	"net/http"
	"strings"
	"testing"
)

func TestInstallmentsSuccess(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		wantBody string
	}{
		{
			"defaults to four payments every two weeks",
			`{"amountCents": 10001}`,
			`{"amountCents":10001,"count":4,"intervalDays":14,"payments":[` +
				`{"number":1,"dueInDays":0,"amountCents":2501},{"number":2,"dueInDays":14,"amountCents":2500},` +
				`{"number":3,"dueInDays":28,"amountCents":2500},{"number":4,"dueInDays":42,"amountCents":2500}]}`,
		},
		{
			"custom count",
			`{"amountCents": 1000, "count": 3}`,
			`{"amountCents":1000,"count":3,"intervalDays":14,"payments":[` +
				`{"number":1,"dueInDays":0,"amountCents":334},{"number":2,"dueInDays":14,"amountCents":333},` +
				`{"number":3,"dueInDays":28,"amountCents":333}]}`,
		},
	}

	server := newTestServer(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, server, http.MethodPost, "/api/v1/installments", tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tt.wantBody {
				t.Errorf("body = %s, want %s", got, tt.wantBody)
			}
		})
	}
}

func TestInstallmentsErrors(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		{"missing amount", `{"count": 4}`, http.StatusBadRequest, "INVALID_REQUEST", `"amountCents" is required`},
		{"fractional cents", `{"amountCents": 100.5}`, http.StatusBadRequest, "INVALID_REQUEST", `field "amountCents" must be a whole number`},
		{"string amount", `{"amountCents": "100"}`, http.StatusBadRequest, "INVALID_REQUEST", "must be a whole number"},
		{"zero amount", `{"amountCents": 0}`, http.StatusBadRequest, "INVALID_REQUEST", "greater than zero"},
		{"negative amount", `{"amountCents": -100}`, http.StatusBadRequest, "INVALID_REQUEST", "greater than zero"},
		{"count too low", `{"amountCents": 100, "count": 1}`, http.StatusBadRequest, "INVALID_REQUEST", "count must be between 2 and 12"},
		{"count too high", `{"amountCents": 100, "count": 13}`, http.StatusBadRequest, "INVALID_REQUEST", "count must be between 2 and 12"},
		{"unknown field", `{"amount": 100}`, http.StatusBadRequest, "INVALID_REQUEST", `unknown field "amount"`},
		{"too small to split", `{"amountCents": 3}`, http.StatusUnprocessableEntity, "AMOUNT_TOO_SMALL", "at least one cent"},
		{"too large to split", `{"amountCents": 9007199254740992}`, http.StatusUnprocessableEntity, "AMOUNT_TOO_LARGE", "too large"},
	}

	server := newTestServer(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, server, http.MethodPost, "/api/v1/installments", tt.body)
			assertError(t, rec, tt.wantStatus, tt.wantCode, tt.wantMessage)
		})
	}
}
