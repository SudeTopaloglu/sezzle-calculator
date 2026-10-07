package main

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"testing"
	"time"
)

var discardLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

func freePort(t *testing.T) string {
	t.Helper()
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	return strconv.Itoa(listener.Addr().(*net.TCPAddr).Port)
}

func TestRunServesUntilCancelled(t *testing.T) {
	port := freePort(t)
	env := map[string]string{"PORT": port}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- run(ctx, discardLogger, func(key string) string { return env[key] }) }()

	var resp *http.Response
	var err error
	for range 50 {
		if resp, err = http.Get("http://localhost:" + port + "/healthz"); err == nil {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if err != nil {
		t.Fatalf("server did not start: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("GET /healthz status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("run returned %v after shutdown, want nil", err)
		}
	case <-time.After(shutdownTimeout):
		t.Fatal("run did not return after the context was cancelled")
	}
}

func TestRunFailsOnInvalidPort(t *testing.T) {
	getenv := func(key string) string {
		if key == "PORT" {
			return "not-a-port"
		}
		return ""
	}
	if err := run(context.Background(), discardLogger, getenv); err == nil {
		t.Error("run returned nil for an invalid port, want an error")
	}
}
