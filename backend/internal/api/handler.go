package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"calculator-api/internal/calculator"
)

// maxBodyBytes caps request bodies; a valid request is only a few dozen bytes.
const maxBodyBytes = 1 << 10

type calculateRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type calculateResponse struct {
	Operation string   `json:"operation"`
	A         float64  `json:"a"`
	B         *float64 `json:"b,omitempty"`
	Result    float64  `json:"result"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// domainErrors maps calculation errors to API error codes. All of them are
// answered with 422: the request is well-formed but has no valid result.
var domainErrors = []struct {
	err  error
	code string
}{
	{calculator.ErrDivisionByZero, "DIVISION_BY_ZERO"},
	{calculator.ErrNegativeSquareRoot, "NEGATIVE_SQUARE_ROOT"},
	{calculator.ErrUndefinedResult, "UNDEFINED_RESULT"},
	{calculator.ErrOutOfRange, "RESULT_OUT_OF_RANGE"},
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	op, err := calculator.Lookup(r.PathValue("operation"))
	if err != nil {
		message := fmt.Sprintf("%v; supported operations: %s", err, strings.Join(calculator.Names(), ", "))
		writeError(w, http.StatusNotFound, "UNKNOWN_OPERATION", message)
		return
	}

	var req calculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	operands, err := req.operands(op.Arity)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	result, err := op.Apply(operands...)
	if err != nil {
		writeCalculationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Operation: op.Name, A: *req.A, B: req.B, Result: result})
}

// operands checks that the request carries exactly the operands the operation needs.
func (req calculateRequest) operands(arity int) ([]float64, error) {
	if req.A == nil {
		return nil, errors.New(`operand "a" is required`)
	}
	if arity == 1 {
		if req.B != nil {
			return nil, errors.New(`this operation takes a single operand "a"; remove "b"`)
		}
		return []float64{*req.A}, nil
	}
	if req.B == nil {
		return nil, errors.New(`operand "b" is required`)
	}
	return []float64{*req.A, *req.B}, nil
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
			return fmt.Errorf("field %q must be a valid number", typeErr.Field)
		case errors.As(err, &maxBytesErr):
			return fmt.Errorf("request body must not exceed %d bytes", maxBodyBytes)
		case strings.HasPrefix(err.Error(), "json: unknown field "):
			return fmt.Errorf("request body contains unknown field %s", strings.TrimPrefix(err.Error(), "json: unknown field "))
		default:
			return errors.New(`request body must be a JSON object such as {"a": 1, "b": 2}`)
		}
	}
	if decoder.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}

func writeCalculationError(w http.ResponseWriter, err error) {
	for _, domainErr := range domainErrors {
		if errors.Is(err, domainErr.err) {
			writeError(w, http.StatusUnprocessableEntity, domainErr.code, err.Error())
			return
		}
	}
	// Operands are validated before Apply, so any other error is a bug.
	writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected error while calculating")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
