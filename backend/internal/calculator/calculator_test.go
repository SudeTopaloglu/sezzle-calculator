package calculator

import (
	"errors"
	"math"
	"slices"
	"testing"
)

func TestApply(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		operands  []float64
		want      float64
		wantErr   error
	}{
		{"add integers", "add", []float64{2, 3}, 5, nil},
		{"add negatives", "add", []float64{-2.5, -0.5}, -3, nil},
		{"subtract", "subtract", []float64{10, 4}, 6, nil},
		{"subtract to negative", "subtract", []float64{4, 10}, -6, nil},
		{"multiply", "multiply", []float64{6, 7}, 42, nil},
		{"multiply by zero", "multiply", []float64{123.45, 0}, 0, nil},
		{"multiply negative zero is normalized", "multiply", []float64{-5, 0}, 0, nil},
		{"divide", "divide", []float64{10, 4}, 2.5, nil},
		{"divide zero by number", "divide", []float64{0, 5}, 0, nil},
		{"divide by zero", "divide", []float64{1, 0}, 0, ErrDivisionByZero},
		{"divide zero by zero", "divide", []float64{0, 0}, 0, ErrDivisionByZero},
		{"power", "power", []float64{2, 10}, 1024, nil},
		{"power with negative exponent", "power", []float64{2, -2}, 0.25, nil},
		{"power with fractional exponent", "power", []float64{9, 0.5}, 3, nil},
		{"power of zero to zero", "power", []float64{0, 0}, 1, nil},
		{"power overflow", "power", []float64{10, 400}, 0, ErrOutOfRange},
		{"power of zero to negative", "power", []float64{0, -1}, 0, ErrDivisionByZero},
		{"power of negative zero to negative", "power", []float64{math.Copysign(0, -1), -2}, 0, ErrDivisionByZero},
		{"power with non-real result", "power", []float64{-8, 1.0 / 3}, 0, ErrUndefinedResult},
		{"sqrt", "sqrt", []float64{16}, 4, nil},
		{"sqrt of zero", "sqrt", []float64{0}, 0, nil},
		{"sqrt of negative", "sqrt", []float64{-4}, 0, ErrNegativeSquareRoot},
		{"percentage of a number", "percentage", []float64{10, 50}, 5, nil},
		{"percentage of one", "percentage", []float64{50, 1}, 0.5, nil},
		{"percentage over one hundred", "percentage", []float64{150, 80}, 120, nil},
		{"percentage of negative", "percentage", []float64{-12.5, 1}, -0.125, nil},
		{"percentage overflow", "percentage", []float64{math.MaxFloat64, 200}, 0, ErrOutOfRange},
		{"multiply overflow", "multiply", []float64{math.MaxFloat64, 2}, 0, ErrOutOfRange},
		{"too few operands", "add", []float64{1}, 0, ErrOperandCount},
		{"too many operands", "sqrt", []float64{1, 2}, 0, ErrOperandCount},
		{"NaN operand", "add", []float64{math.NaN(), 1}, 0, ErrInvalidOperand},
		{"infinite operand", "add", []float64{math.Inf(1), 1}, 0, ErrInvalidOperand},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op, err := Lookup(tt.operation)
			if err != nil {
				t.Fatalf("Lookup(%q) returned error: %v", tt.operation, err)
			}

			got, err := op.Apply(tt.operands...)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Apply(%v) error = %v, want %v", tt.operands, err, tt.wantErr)
			}
			if got != tt.want || math.Signbit(got) != math.Signbit(tt.want) {
				t.Errorf("Apply(%v) = %v, want %v", tt.operands, got, tt.want)
			}
		})
	}
}

func TestLookup(t *testing.T) {
	op, err := Lookup("divide")
	if err != nil {
		t.Fatalf("Lookup(divide) returned error: %v", err)
	}
	if op.Name != "divide" || op.Arity != 2 {
		t.Errorf("Lookup(divide) = {Name: %q, Arity: %d}, want {Name: \"divide\", Arity: 2}", op.Name, op.Arity)
	}

	if _, err := Lookup("modulo"); !errors.Is(err, ErrUnknownOperation) {
		t.Errorf("Lookup(modulo) error = %v, want %v", err, ErrUnknownOperation)
	}
}

func TestNames(t *testing.T) {
	want := []string{"add", "divide", "multiply", "percentage", "power", "sqrt", "subtract"}
	if got := Names(); !slices.Equal(got, want) {
		t.Errorf("Names() = %v, want %v", got, want)
	}
}
