package installments

import (
	"errors"
	"slices"
	"testing"
)

func TestSplit(t *testing.T) {
	tests := []struct {
		name        string
		amountCents int64
		count       int
		want        []int64
	}{
		{"even split", 10000, 4, []int64{2500, 2500, 2500, 2500}},
		{"one leftover cent goes first", 10001, 4, []int64{2501, 2500, 2500, 2500}},
		{"three leftover cents", 10003, 4, []int64{2501, 2501, 2501, 2500}},
		{"smallest possible amount", 4, 4, []int64{1, 1, 1, 1}},
		{"custom count", 1000, 3, []int64{334, 333, 333}},
		{"maximum count", 1200, 12, []int64{100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100}},
		{"largest amount", MaxAmountCents, 2, []int64{MaxAmountCents/2 + 1, MaxAmountCents / 2}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payments, err := Split(tt.amountCents, tt.count)
			if err != nil {
				t.Fatalf("Split(%d, %d) returned error: %v", tt.amountCents, tt.count, err)
			}

			amounts := make([]int64, len(payments))
			for i, payment := range payments {
				amounts[i] = payment.AmountCents
				if payment.Number != i+1 || payment.DueInDays != i*IntervalDays {
					t.Errorf("payment %d = {Number: %d, DueInDays: %d}, want {Number: %d, DueInDays: %d}",
						i, payment.Number, payment.DueInDays, i+1, i*IntervalDays)
				}
			}
			if !slices.Equal(amounts, tt.want) {
				t.Errorf("amounts = %v, want %v", amounts, tt.want)
			}
		})
	}
}

func TestSplitAlwaysAddsUpToTheTotal(t *testing.T) {
	for amount := int64(MaxCount); amount < 5000; amount += 7 {
		for count := MinCount; count <= MaxCount; count++ {
			payments, err := Split(amount, count)
			if err != nil {
				t.Fatalf("Split(%d, %d) returned error: %v", amount, count, err)
			}
			var sum int64
			for _, payment := range payments {
				sum += payment.AmountCents
			}
			if sum != amount {
				t.Fatalf("Split(%d, %d) payments add up to %d", amount, count, sum)
			}
			if first, last := payments[0].AmountCents, payments[count-1].AmountCents; first-last > 1 {
				t.Fatalf("Split(%d, %d) payments differ by %d cents", amount, count, first-last)
			}
		}
	}
}

func TestSplitErrors(t *testing.T) {
	tests := []struct {
		name        string
		amountCents int64
		count       int
		wantErr     error
	}{
		{"zero amount", 0, 4, ErrInvalidAmount},
		{"negative amount", -500, 4, ErrInvalidAmount},
		{"fewer cents than payments", 3, 4, ErrAmountTooSmall},
		{"amount above the safe maximum", MaxAmountCents + 1, 4, ErrAmountTooLarge},
		{"count too low", 1000, 1, ErrInvalidCount},
		{"count too high", 1000, 13, ErrInvalidCount},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := Split(tt.amountCents, tt.count); !errors.Is(err, tt.wantErr) {
				t.Errorf("Split(%d, %d) error = %v, want %v", tt.amountCents, tt.count, err, tt.wantErr)
			}
		})
	}
}
