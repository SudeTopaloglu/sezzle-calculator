// Package installments splits a purchase amount into equal scheduled payments.
// Amounts are integer cents, so a plan always adds up to the exact total.
package installments

import (
	"errors"
	"fmt"
)

const (
	DefaultCount = 4
	MinCount     = 2
	MaxCount     = 12
	// IntervalDays is the time between two consecutive payments.
	IntervalDays = 14
	// MaxAmountCents is the largest integer a JavaScript number holds exactly,
	// so browser clients can display every plan without rounding.
	MaxAmountCents = 1<<53 - 1
)

// Errors returned by Split. Match them with errors.Is.
var (
	ErrInvalidAmount  = errors.New("amount must be greater than zero")
	ErrInvalidCount   = fmt.Errorf("count must be between %d and %d", MinCount, MaxCount)
	ErrAmountTooSmall = errors.New("amount is too small to split: every payment must be at least one cent")
	ErrAmountTooLarge = errors.New("amount is too large to split")
)

// Payment is one scheduled installment.
type Payment struct {
	Number      int // position in the plan, starting at 1
	DueInDays   int // days from today; the first payment is due today
	AmountCents int64
}

// Split divides amountCents into count payments due every IntervalDays.
// Payments differ by at most one cent and leftover cents go to the earliest
// payments, e.g. $100.01 in 4 is $25.01 + $25.00 + $25.00 + $25.00.
func Split(amountCents int64, count int) ([]Payment, error) {
	switch {
	case count < MinCount || count > MaxCount:
		return nil, ErrInvalidCount
	case amountCents <= 0:
		return nil, ErrInvalidAmount
	case amountCents > MaxAmountCents:
		return nil, ErrAmountTooLarge
	case amountCents < int64(count):
		return nil, ErrAmountTooSmall
	}

	base, remainder := amountCents/int64(count), amountCents%int64(count)
	payments := make([]Payment, count)
	for i := range payments {
		amount := base
		if int64(i) < remainder {
			amount++
		}
		payments[i] = Payment{Number: i + 1, DueInDays: i * IntervalDays, AmountCents: amount}
	}
	return payments, nil
}
