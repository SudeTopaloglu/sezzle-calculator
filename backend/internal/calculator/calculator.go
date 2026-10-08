// Package calculator implements the arithmetic operations exposed by the API.
// It knows nothing about HTTP, so it can be tested and reused on its own.
package calculator

import (
	"errors"
	"fmt"
	"math"
	"slices"
)

// Errors returned by operations. Match them with errors.Is.
var (
	ErrUnknownOperation   = errors.New("unknown operation")
	ErrOperandCount       = errors.New("wrong number of operands")
	ErrInvalidOperand     = errors.New("operands must be finite numbers")
	ErrDivisionByZero     = errors.New("division by zero is undefined")
	ErrNegativeSquareRoot = errors.New("square root of a negative number is not a real number")
	ErrUndefinedResult    = errors.New("result is not a real number")
	ErrOutOfRange         = errors.New("result is too large to represent")
)

// Operation is a named arithmetic function that takes a fixed number of operands.
type Operation struct {
	Name  string
	Arity int
	fn    func(operands []float64) (float64, error)
}

var operations = map[string]Operation{
	"add":        binary(func(a, b float64) (float64, error) { return a + b, nil }),
	"subtract":   binary(func(a, b float64) (float64, error) { return a - b, nil }),
	"multiply":   binary(func(a, b float64) (float64, error) { return a * b, nil }),
	"divide":     binary(divide),
	"power":      binary(power),
	"sqrt":       unary(squareRoot),
	"percentage": binary(percentOf),
}

// Lookup returns the operation registered under name.
func Lookup(name string) (Operation, error) {
	op, ok := operations[name]
	if !ok {
		return Operation{}, fmt.Errorf("%w %q", ErrUnknownOperation, name)
	}
	op.Name = name
	return op, nil
}

// Names returns the names of all supported operations in alphabetical order.
func Names() []string {
	names := make([]string, 0, len(operations))
	for name := range operations {
		names = append(names, name)
	}
	slices.Sort(names)
	return names
}

// Apply runs the operation. It validates the operands and guarantees that a
// successful result is a finite number, which is always safe to encode as JSON.
func (op Operation) Apply(operands ...float64) (float64, error) {
	if len(operands) != op.Arity {
		return 0, fmt.Errorf("%w: %s expects %d, got %d", ErrOperandCount, op.Name, op.Arity, len(operands))
	}
	for _, operand := range operands {
		if math.IsNaN(operand) || math.IsInf(operand, 0) {
			return 0, ErrInvalidOperand
		}
	}

	result, err := op.fn(operands)
	switch {
	case err != nil:
		return 0, err
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrOutOfRange
	case result == 0:
		return 0, nil // turns -0 into 0
	default:
		return result, nil
	}
}

func binary(fn func(a, b float64) (float64, error)) Operation {
	return Operation{Arity: 2, fn: func(x []float64) (float64, error) { return fn(x[0], x[1]) }}
}

func unary(fn func(a float64) (float64, error)) Operation {
	return Operation{Arity: 1, fn: func(x []float64) (float64, error) { return fn(x[0]) }}
}

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

// power returns a to the power b. Zero to a negative power is a division by
// zero (0^-2 is 1/0^2), not an overflow, although math.Pow returns +Inf.
func power(a, b float64) (float64, error) {
	if a == 0 && b < 0 {
		return 0, ErrDivisionByZero
	}
	return math.Pow(a, b), nil
}

// percentOf returns a percent of b. Multiplying first keeps whole-number
// cases exact: 10% of 50 is 5, not 5.000000000000001.
func percentOf(a, b float64) (float64, error) {
	return a * b / 100, nil
}

func squareRoot(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return math.Sqrt(a), nil
}
