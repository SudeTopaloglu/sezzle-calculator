# Test Coverage Report

Coverage of both layers, measured on **October 8, 2026** from the test suites in this repository. All 270 tests pass.

## Summary

| Layer | Tests | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- | --- |
| **Backend** (Go) | 104 cases in 17 test functions | **96.6%** | n/a | n/a | n/a |
| **Frontend** (TypeScript) | 166 tests in 8 files | **99.25%** | **95.81%** | **98.29%** | **99.72%** |

Go reports statement coverage only. Every line that is not covered is listed below with the reason.

## Reproduce

```bash
# Backend: summary per package, then per function, then an HTML report
cd backend
go test -race -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
go tool cover -html=coverage.out -o coverage.html

# Frontend: per-file table in the terminal, HTML report in frontend/coverage/index.html
cd frontend
npm run coverage
```

## Backend (Go)

| Package | Coverage | Test cases | What the tests check |
| --- | --- | --- | --- |
| `internal/calculator` | 100% | 34 | Every operation, plus the edge cases: division by zero, `0 ÷ 0`, zero to a negative power (`0^−1`), negative square root, overflow (`10^400`), non-real powers (`(−8)^⅓`), `−0` normalized to `0`, and wrong operand count or NaN/Inf operands |
| `internal/installments` | 100% | 14 | Cent-exact splits, leftover cents going to the earliest payments, and all validation errors. A sweep of 5,000 amounts × every allowed count checks that each plan adds up to the total |
| `internal/api` | 99.2% | 53 | Every endpoint through the real router: status codes, exact JSON bodies, every validation error (malformed JSON, wrong types, unknown fields, oversized bodies), JSON 404/405 errors for unknown paths and wrong methods (with and without the frontend served), static file serving, and that `openapi.yaml` documents exactly the routes the server has |
| `cmd/server` | 84.2% | 3 | The server starts, answers requests and shuts down cleanly when cancelled; the real `main` shuts down gracefully on SIGTERM, as sent by `docker stop`; an invalid port fails |

<details>
<summary><b>Coverage per function</b></summary>

| File | Function | Coverage |
| --- | --- | --- |
| `backend/cmd/server/main.go` | `main` | 80.0% |
| `backend/cmd/server/main.go` | `run` | 85.7% |
| `backend/internal/api/calculate.go` | `handleCalculate` | 100.0% |
| `backend/internal/api/calculate.go` | `operands` | 100.0% |
| `backend/internal/api/calculate.go` | `writeCalculationError` | 80.0% |
| `backend/internal/api/installments.go` | `handleInstallments` | 100.0% |
| `backend/internal/api/json.go` | `decodeJSON` | 100.0% |
| `backend/internal/api/json.go` | `describeKind` | 100.0% |
| `backend/internal/api/json.go` | `writeError` | 100.0% |
| `backend/internal/api/json.go` | `writeJSON` | 100.0% |
| `backend/internal/api/router.go` | `NewRouter` | 100.0% |
| `backend/internal/api/router.go` | `handleHealth` | 100.0% |
| `backend/internal/api/router.go` | `handleMethodNotAllowed` | 100.0% |
| `backend/internal/api/router.go` | `handleNotFound` | 100.0% |
| `backend/internal/api/router.go` | `WriteHeader` | 100.0% |
| `backend/internal/api/router.go` | `logRequests` | 100.0% |
| `backend/internal/calculator/calculator.go` | `Lookup` | 100.0% |
| `backend/internal/calculator/calculator.go` | `Names` | 100.0% |
| `backend/internal/calculator/calculator.go` | `Apply` | 100.0% |
| `backend/internal/calculator/calculator.go` | `binary` | 100.0% |
| `backend/internal/calculator/calculator.go` | `unary` | 100.0% |
| `backend/internal/calculator/calculator.go` | `divide` | 100.0% |
| `backend/internal/calculator/calculator.go` | `power` | 100.0% |
| `backend/internal/calculator/calculator.go` | `percentOf` | 100.0% |
| `backend/internal/calculator/calculator.go` | `squareRoot` | 100.0% |
| `backend/internal/installments/installments.go` | `Split` | 100.0% |
| **Total** | | **96.6%** |

</details>

### Not covered, and why

| Code | Reason |
| --- | --- |
| `main()`: the `os.Exit(1)` path | Exiting would end the test process itself. The startup failure it reports comes from `run()`, which is tested with an invalid port |
| `run()`: 2 error paths | Failures while the server is already shutting down, which can't be triggered reliably from a test |
| `writeCalculationError`: `INTERNAL_ERROR` fallback | A safety net. Every calculation error has its own code, so no request can reach it |

## Frontend (TypeScript)

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `src/api/calculatorApi.ts` | 100% | 100% | 100% | 100% |
| `src/calculator/format.ts` | 100% | 100% | 100% | 100% |
| `src/calculator/history.ts` | 100% | 100% | 100% | 100% |
| `src/calculator/keys.ts` | 100% | 100% | 100% | 100% |
| `src/calculator/operations.ts` | 100% | 100% | 100% | 100% |
| `src/calculator/reducer.ts` | 100% | 98.66% | 100% | 100% |
| `src/components/Calculator.tsx` | 100% | 83.33% | 100% | 100% |
| `src/components/Display.tsx` | 100% | 100% | 100% | 100% |
| `src/components/HistoryPanel.tsx` | 95.45% | 100% | 91.66% | 100% |
| `src/components/InstallmentsPanel.tsx` | 95.23% | 86.66% | 100% | 94.73% |
| `src/components/Keypad.tsx` | 100% | 100% | 100% | 100% |
| `src/components/Panel.tsx` | 100% | 75% | 100% | 100% |
| `src/components/Toolbar.tsx` | 100% | 100% | 100% | 100% |
| `src/components/icons.tsx` | 100% | 100% | 100% | 100% |
| `src/hooks/useCalculator.ts` | 100% | 93.54% | 100% | 100% |
| `src/hooks/useCopy.ts` | 93.33% | 100% | 75% | 100% |
| `src/hooks/useHistory.ts` | 100% | 100% | 100% | 100% |
| `src/hooks/useInstallments.ts` | 100% | 86.66% | 100% | 100% |
| `src/hooks/useKeyboardShortcuts.ts` | 100% | 100% | 100% | 100% |
| **All files** | **99.25%** | **95.81%** | **98.29%** | **99.72%** |

| Test file | Tests | What it checks |
| --- | --- | --- |
| `calculator/reducer.test.ts` | 39 | Number entry, digit limits, delete, ± sign, the operator queue, results, √ and %, recall and error recovery, all as pure state transitions |
| `calculator/operations.test.ts` | 20 | Operator precedence and associativity (`2 + 3 × 4`, `2 ^ 3 ^ 2`) and expression text |
| `calculator/format.test.ts` | 28 | Number, entry, plain-text and currency formatting, including scientific notation and float noise (`0.1 + 0.2` → `0.3`) |
| `calculator/history.test.ts` | 12 | Grouping into days and tapes, and reading stored history, including corrupted data |
| `api/calculatorApi.test.ts` | 16 | Request shapes, response validation, error codes, network failures, retryable errors |
| `components/Calculator.test.tsx` | 36 | The whole app against a fake backend: every operation, precedence, percent, errors, the in-flight guard, keyboard input and copy |
| `components/HistoryPanel.test.tsx` | 8 | Recording, tapes, reusing a result, clearing with confirmation, persistence after reload, unavailable storage, Escape and focus |
| `components/InstallmentsPanel.test.tsx` | 7 | Pay in 4 plan, rounding note, invalid and too-small amounts, retry after a network error, closing and focus |

### Not covered, and why

| Code | Reason |
| --- | --- |
| `InstallmentsPanel.tsx`: "In N days" label | Only used for intervals that aren't whole weeks. The API always schedules payments 14 days apart |
| `Panel.tsx`: 3 branches | Browser-only fallbacks, such as `scrollIntoView`, which the test DOM (jsdom) doesn't implement |
| `useInstallments.ts`: 2 branches | Discarding a slow response that a newer request already replaced. It guards against a race and isn't reachable deterministically in a test |
| `useCopy.ts` and `HistoryPanel.tsx`: 1 function each | Timers that reset the "Copied" label after 1.5 s and the "Clear all?" prompt after 3 s |
| `Calculator.tsx`, `useCalculator.ts`, `reducer.ts`: a few branches | Defensive guards that the UI never triggers, e.g. opening Pay in 4 while its button is disabled |

