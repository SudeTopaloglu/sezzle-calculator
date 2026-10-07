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
