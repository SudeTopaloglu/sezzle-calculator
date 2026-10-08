package api

import (
	"encoding/json"
	"fmt"
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

func assertError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode, wantMessage string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, wantStatus, rec.Body)
	}
	var got errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("response is not a JSON error: %v (body: %s)", err, rec.Body)
	}
	if got.Error.Code != wantCode {
		t.Errorf("code = %q, want %q", got.Error.Code, wantCode)
	}
	if !strings.Contains(got.Error.Message, wantMessage) {
		t.Errorf("message = %q, want it to contain %q", got.Error.Message, wantMessage)
	}
}

// TestUnmatchedAPIRequests checks that requests no handler accepts still get a
// JSON error, both with and without the frontend's file server in front.
func TestUnmatchedAPIRequests(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		{"GET an operation", http.MethodGet, "/api/v1/add", http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "GET is not allowed; use POST"},
		{"DELETE installments", http.MethodDelete, "/api/v1/installments", http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "DELETE is not allowed"},
		{"unknown version", http.MethodPost, "/api/v2/add", http.StatusNotFound, "NOT_FOUND", "no API endpoint at /api/v2/add"},
		{"nested path", http.MethodPost, "/api/v1/add/extra", http.StatusNotFound, "NOT_FOUND", "/api/v1/add/extra"},
	}

	for _, staticDir := range []string{"", t.TempDir()} {
		server := newTestServer(t, staticDir)
		for _, tt := range tests {
			t.Run(fmt.Sprintf("%s/static=%t", tt.name, staticDir != ""), func(t *testing.T) {
				rec := serve(t, server, tt.method, tt.path, "")

				assertError(t, rec, tt.wantStatus, tt.wantCode, tt.wantMessage)
				if tt.wantStatus == http.StatusMethodNotAllowed && rec.Header().Get("Allow") != http.MethodPost {
					t.Errorf("Allow = %q, want POST", rec.Header().Get("Allow"))
				}
			})
		}
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
