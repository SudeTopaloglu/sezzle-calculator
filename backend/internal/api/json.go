package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"
)

// maxBodyBytes caps request bodies; a valid request is only a few dozen bytes.
const maxBodyBytes = 1 << 10

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// decodeJSON reads a single JSON object into dst and turns decoding failures
// into messages that are safe and useful to show to API clients.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		var syntaxErr *json.SyntaxError
		var typeErr *json.UnmarshalTypeError
		var maxBytesErr *http.MaxBytesError

		switch {
		case errors.Is(err, io.EOF):
			return errors.New("request body must not be empty")
		case errors.As(err, &syntaxErr), errors.Is(err, io.ErrUnexpectedEOF):
			return errors.New("request body must be valid JSON")
		case errors.As(err, &typeErr) && typeErr.Field != "":
			return fmt.Errorf("field %q must be %s", typeErr.Field, describeKind(typeErr.Type))
		case errors.As(err, &maxBytesErr):
			return fmt.Errorf("request body must not exceed %d bytes", maxBodyBytes)
		case strings.HasPrefix(err.Error(), "json: unknown field "):
			return fmt.Errorf("request body contains unknown field %s", strings.TrimPrefix(err.Error(), "json: unknown field "))
		default:
			return errors.New("request body must be a JSON object")
		}
	}
	if decoder.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}

func describeKind(t reflect.Type) string {
	switch t.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return "a whole number"
	default:
		return "a valid number"
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
