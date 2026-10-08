// Package api exposes the calculator over a JSON REST API.
package api

import (
	"log/slog"
	"net/http"
	"time"
)

// NewRouter returns the service's HTTP handler. When staticDir is not empty,
// the built frontend is served from it, so one process can host the whole app.
func NewRouter(logger *slog.Logger, staticDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("POST /api/v1/installments", handleInstallments)
	mux.HandleFunc("POST /api/v1/{operation}", handleCalculate)

	// Any other request under /api/ gets a JSON error, not the mux's plain-text
	// one or the frontend's file server. The more specific routes above win.
	mux.HandleFunc("/api/v1/{operation}", handleMethodNotAllowed)
	mux.HandleFunc("/api/", handleNotFound)

	if staticDir != "" {
		// Registered without a method: "GET /" would conflict with "/api/".
		mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	}
	return logRequests(logger, mux)
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleMethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Allow", http.MethodPost)
	writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", r.Method+" is not allowed; use POST")
}

func handleNotFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", "no API endpoint at "+r.URL.Path)
}

// statusRecorder captures the status code written by a handler.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"duration", time.Since(start),
		)
	})
}
