package api

import (
	"errors"
	"net/http"

	"calculator-api/internal/installments"
)

type installmentsRequest struct {
	AmountCents *int64 `json:"amountCents"`
	Count       *int   `json:"count"`
}

type installmentsResponse struct {
	AmountCents  int64             `json:"amountCents"`
	Count        int               `json:"count"`
	IntervalDays int               `json:"intervalDays"`
	Payments     []paymentResponse `json:"payments"`
}

type paymentResponse struct {
	Number      int   `json:"number"`
	DueInDays   int   `json:"dueInDays"`
	AmountCents int64 `json:"amountCents"`
}

func handleInstallments(w http.ResponseWriter, r *http.Request) {
	var req installmentsRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if req.AmountCents == nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", `field "amountCents" is required`)
		return
	}
	count := installments.DefaultCount
	if req.Count != nil {
		count = *req.Count
	}

	payments, err := installments.Split(*req.AmountCents, count)
	switch {
	case errors.Is(err, installments.ErrAmountTooSmall):
		writeError(w, http.StatusUnprocessableEntity, "AMOUNT_TOO_SMALL", err.Error())
		return
	case errors.Is(err, installments.ErrAmountTooLarge):
		writeError(w, http.StatusUnprocessableEntity, "AMOUNT_TOO_LARGE", err.Error())
		return
	case err != nil:
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	response := installmentsResponse{
		AmountCents:  *req.AmountCents,
		Count:        count,
		IntervalDays: installments.IntervalDays,
		Payments:     make([]paymentResponse, len(payments)),
	}
	for i, payment := range payments {
		response.Payments[i] = paymentResponse(payment)
	}
	writeJSON(w, http.StatusOK, response)
}
