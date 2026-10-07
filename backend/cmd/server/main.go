// Command server runs the calculator REST API.
//
// Configuration is read from the environment:
//
//	PORT        port to listen on (default 8080)
//	STATIC_DIR  directory with the built frontend to serve (optional)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"calculator-api/internal/api"
)

const shutdownTimeout = 5 * time.Second

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(ctx, logger, os.Getenv); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// run serves HTTP until ctx is cancelled, then shuts down gracefully.
func run(ctx context.Context, logger *slog.Logger, getenv func(string) string) error {
	port := getenv("PORT")
	if port == "" {
		port = "8080"
	}
	staticDir := getenv("STATIC_DIR")

	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return err
	}
	server := &http.Server{
		Handler:           api.NewRouter(logger, staticDir),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", listener.Addr().String(), "staticDir", staticDir)
		serveErr <- server.Serve(listener)
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
		logger.Info("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
