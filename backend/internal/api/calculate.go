package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"calculator-api/internal/calculator"
)

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

// calculationErrors maps calculation errors to API error codes. All of them
// are answered with 422: the request is well-formed but has no valid result.
var calculationErrors = []struct {
	err  error
	code string
}{
	{calculator.ErrDivisionByZero, "DIVISION_BY_ZERO"},
	{calculator.ErrNegativeSquareRoot, "NEGATIVE_SQUARE_ROOT"},
	{calculator.ErrUndefinedResult, "UNDEFINED_RESULT"},
	{calculator.ErrOutOfRange, "RESULT_OUT_OF_RANGE"},
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

func writeCalculationError(w http.ResponseWriter, err error) {
	for _, known := range calculationErrors {
		if errors.Is(err, known.err) {
			writeError(w, http.StatusUnprocessableEntity, known.code, err.Error())
			return
		}
	}
	// Operands are validated before Apply, so any other error is a bug.
	writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected error while calculating")
}
