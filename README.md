# Calculator: React + Go

A full-stack calculator. The React (TypeScript) frontend handles input and display, and every calculation is done by a Go REST microservice.

![Calculator, history panel and Split in 4 plan](docs/screenshot.png)

**Required operations:** addition, subtraction, multiplication and division.
**Optional operations:** exponentiation, square root and percentage.

**Extras beyond the brief:**
- **Split in 4.** Turns the number on screen into 4 equal payments every 2 weeks. The backend endpoint works in integer cents, so the payments always add up to the exact total.
- **History.** Past calculations appear as tape-style cards, with chained steps grouped together. Tap any result to use it again. The history survives a page reload.
- **Copy result.** Copies the plain number to the clipboard.
- **OpenAPI spec.** [`backend/api/openapi.yaml`](backend/api/openapi.yaml) documents every endpoint, and a test keeps it in sync with the router.

## Contents

- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [API](#api)
- [Using the calculator](#using-the-calculator)
- [Testing and coverage](#testing-and-coverage)
- [Design decisions](#design-decisions)
- [Assumptions and trade-offs](#assumptions-and-trade-offs)
- [AI usage](#ai-usage)

## Quick start

### Option 1: Docker (one command)

```bash
docker build -t sezzle-calculator .
docker run --rm -p 8080:8080 sezzle-calculator
```

Open http://localhost:8080. The Go server serves both the API and the built frontend.

### Option 2: Run frontend and backend separately (development)

**Prerequisites:** Go 1.24+ and Node.js 20.19+ or 22.12+.

```bash
# Terminal 1: backend on http://localhost:8080
cd backend
go run ./cmd/server

# Terminal 2: frontend on http://localhost:5173 (hot reload)
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend on port 8080, so no CORS setup is needed.

A `Makefile` wraps the common commands: `make backend`, `make frontend`, `make test`, `make lint`, `make coverage` and `make docker`.

### Configuration

| Variable     | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `PORT`       | `8080`  | Port the backend listens on                         |
| `STATIC_DIR` | (unset) | If set, the backend also serves the frontend build from this directory |

## Project structure

```
.
├── backend/                       Go REST microservice (standard library only)
│   ├── api/openapi.yaml           OpenAPI 3.1 spec for every endpoint
│   ├── cmd/server/                Entry point: config, HTTP server, graceful shutdown
│   └── internal/
│       ├── calculator/            Arithmetic and validation, no HTTP knowledge
│       ├── installments/          Splits an amount in integer cents into a payment plan
│       └── api/                   Routing, JSON decoding and validation, error mapping
├── frontend/                      React + TypeScript (Vite)
│   └── src/
│       ├── api/                   Typed client for the REST API, error messages
│       ├── calculator/            Pure logic: state reducer, key layout, formatting, history grouping
│       ├── hooks/                 useCalculator, useHistory, useSplit, useCopy, useKeyboardShortcuts
│       ├── components/            Calculator, Display, Keypad, Toolbar, Panel, HistoryPanel, SplitPanel
│       └── test/                  Fake backend and render helpers shared by the UI tests
├── Dockerfile                     Multi-stage build: frontend + backend in one 8 MB image
├── Makefile                       Shortcuts for running, testing and building
└── .github/workflows/ci.yml       Lint, test and build on every push
```

## API

Base URL: `http://localhost:8080`. The full contract is in [`backend/api/openapi.yaml`](backend/api/openapi.yaml); paste it into https://editor.swagger.io to browse it.

| Method | Path                    | Body                     | Result                        |
| ------ | ----------------------- | ------------------------ | ----------------------------- |
| `POST` | `/api/v1/add`           | `{"a": 1, "b": 2}`       | a + b                         |
| `POST` | `/api/v1/subtract`      | `{"a": 1, "b": 2}`       | a − b                         |
| `POST` | `/api/v1/multiply`      | `{"a": 1, "b": 2}`       | a × b                         |
| `POST` | `/api/v1/divide`        | `{"a": 1, "b": 2}`       | a ÷ b                         |
| `POST` | `/api/v1/power`         | `{"a": 1, "b": 2}`       | a raised to the power b       |
| `POST` | `/api/v1/percentage`    | `{"a": 10, "b": 50}`     | a percent of b (a × b ÷ 100)  |
| `POST` | `/api/v1/sqrt`          | `{"a": 9}`               | √a                            |
| `POST` | `/api/v1/installments`  | `{"amountCents": 10001}` | 4 payments every 2 weeks (`count` is optional, 2–12) |
| `GET`  | `/healthz`              |                          | Liveness check                |

Operands are JSON numbers, and every operation except `sqrt` requires both `a` and `b`. `sqrt` takes only `a` and rejects `b`. `amountCents` must be a whole number.

### Examples

```bash
curl -X POST http://localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": 2, "b": 3}'
# 200 {"operation":"add","a":2,"b":3,"result":5}

curl -X POST http://localhost:8080/api/v1/percentage -H 'Content-Type: application/json' -d '{"a": 10, "b": 50}'
# 200 {"operation":"percentage","a":10,"b":50,"result":5}

curl -X POST http://localhost:8080/api/v1/sqrt -H 'Content-Type: application/json' -d '{"a": 81}'
# 200 {"operation":"sqrt","a":81,"result":9}

curl -X POST http://localhost:8080/api/v1/installments -H 'Content-Type: application/json' -d '{"amountCents": 10001}'
# 200 {"amountCents":10001,"count":4,"intervalDays":14,"payments":[
#       {"number":1,"dueInDays":0,"amountCents":2501},{"number":2,"dueInDays":14,"amountCents":2500},
#       {"number":3,"dueInDays":28,"amountCents":2500},{"number":4,"dueInDays":42,"amountCents":2500}]}

curl -X POST http://localhost:8080/api/v1/divide -H 'Content-Type: application/json' -d '{"a": 1, "b": 0}'
# 422 {"error":{"code":"DIVISION_BY_ZERO","message":"division by zero is undefined"}}

curl -X POST http://localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": "1", "b": 2}'
# 400 {"error":{"code":"INVALID_REQUEST","message":"field \"a\" must be a valid number"}}

curl -X POST http://localhost:8080/api/v1/modulo -H 'Content-Type: application/json' -d '{"a": 5, "b": 2}'
# 404 {"error":{"code":"UNKNOWN_OPERATION","message":"unknown operation \"modulo\"; supported operations: add, divide, multiply, percentage, power, sqrt, subtract"}}
```

### Errors

Every error uses the same shape: `{"error": {"code": "...", "message": "..."}}`. The frontend branches on `code`, and `message` is for people.

| Status | Code                   | When                                                                  |
| ------ | ---------------------- | --------------------------------------------------------------------- |
| 400    | `INVALID_REQUEST`      | Empty or malformed JSON, non-numeric or out-of-range value, missing operand, unknown field, body over 1 KB, amount ≤ 0, `count` outside 2–12 |
| 404    | `UNKNOWN_OPERATION`    | The operation in the path does not exist                             |
| 422    | `DIVISION_BY_ZERO`     | `b` is 0 in a division                                               |
| 422    | `NEGATIVE_SQUARE_ROOT` | Square root of a negative number                                     |
| 422    | `UNDEFINED_RESULT`     | The result is not a real number, e.g. `(-8)^0.5`                      |
| 422    | `RESULT_OUT_OF_RANGE`  | The result overflows float64, e.g. `10^400` or `0^-1`                 |
| 422    | `AMOUNT_TOO_SMALL`     | Fewer cents than payments, so some payment would be $0.00            |
| 422    | `AMOUNT_TOO_LARGE`     | More than 2⁵³−1 cents, the largest amount a browser handles exactly  |

## Using the calculator

It works like a standard pocket calculator. Pressing `=`, `√` or `%` sends a request to the backend. The top line of the display shows the expression (`12 × 3 =`), and the main line shows the number being typed or the result.

### Percent

`%` behaves like the calculator on a phone:

| You type      | Result | Why                                             |
| ------------- | ------ | ----------------------------------------------- |
| `50 %`        | 0.5    | On its own, % divides by 100                    |
| `50 + 10 % =` | 55     | After + or −, % takes a percentage of the first number: 50 + 5 |
| `200 − 25 % =`| 150    | 200 − 50                                        |
| `50 × 10 % =` | 5      | After × or ÷, % divides by 100: 50 × 0.1        |

### History

The clock button opens the history. Every successful calculation is saved on its own card, newest first and grouped by day. When a calculation continues from the previous result (`207 − 0.7 = 206.3`, then `206.3 × 39 = …`), both steps share one card, like a strip of calculator tape. Tap a result to put it back on screen. If an operator is pending, the result becomes the second number: `100 +`, then tap `42`, then `=` gives 142. Clearing the history takes two taps, so a stray click can't wipe it. The history is stored in the browser (localStorage, last 100 calculations).

### Split in 4

**Split in 4** sends the number on screen to `/api/v1/installments` and shows a timeline of 4 payments: today, then in 2, 4 and 6 weeks, each with a date and amount. Leftover cents go to the first payments, so $100.01 becomes $25.01 + $25.00 + $25.00 + $25.00. Amounts with more than 2 decimals are rounded to the nearest cent, and the plan says so. Zero, negative or unsplittable amounts get a clear message, and network errors offer **Try again**.

### Keyboard

| Keyboard              | Action           |
| --------------------- | ---------------- |
| `0`–`9`, `.` or `,`   | Enter a number   |
| `+` `-` `*` (or `x`) `/` `^` | Operators |
| `Enter` or `=`        | Equals           |
| `%`                   | Percent          |
| `r`                   | Square root      |
| `n`                   | Toggle sign (±)  |
| `Backspace`           | Delete last digit |
| `Escape` or `Delete`  | All clear (or close an open panel) |

### Other details

- **Chaining.** Operations are evaluated left to right as you go: `2 + 3 ×` shows `5 ×`.
- **Changing your mind.** Pressing a second operator replaces the first: `5 + ×` becomes `5 ×`.
- **Repeat operand.** `5 × =` gives `25`, as on most calculators.
- **Input limits.** You can type at most 15 digits, which float64 represents exactly, and only one decimal point.
- **Errors.** Errors such as "Cannot divide by zero" or "Service unavailable" appear in the display. The next key press starts fresh.
- **Requests in flight.** Key presses are ignored while a request is in flight, so a double-click on `=` never sends two requests.
- **Display formatting.** Results use thousands separators and are rounded to 15 significant digits, so `0.1 + 0.2` shows `0.3`. Very large and very small numbers switch to scientific notation (`1.5e21`), and long numbers shrink the font to stay on one line.
- **Accessibility and responsiveness.** The UI has a light and dark theme that follows the OS setting. Its layout adapts to phones down to 320×640 px. Panels are real dialogs: focus moves into them, the calculator behind becomes inert, Escape closes them, and focus returns to the button that opened them. Animations respect `prefers-reduced-motion`.

## Testing and coverage

```bash
make test        # all unit tests
make coverage    # coverage summaries + HTML reports
```

Or per layer:

```bash
cd backend  && go test -race -cover ./...
cd frontend && npm run coverage
```

HTML reports are written to `backend/coverage.html` and `frontend/coverage/index.html`.

**Current coverage**

| Layer    | Package / area             | Coverage |
| -------- | -------------------------- | -------- |
| Backend  | `internal/calculator`      | 100%     |
| Backend  | `internal/installments`    | 100%     |
| Backend  | `internal/api`             | 99.0%    |
| Backend  | `cmd/server`               | 63.2% (`main()` signal wiring is untested; `run()` is tested) |
| Backend  | **Total**                  | **91.9% of statements** |
| Frontend | **All files (129 tests)**  | **99.4% lines, 98.9% statements, 94.5% branches** |

**What is tested**

- **`calculator` (Go):** every operation, plus the edge cases: division by zero, `0/0`, negative square root, overflow, non-real powers, `-0` normalization, and wrong operand count or NaN/Inf operands.
- **`installments` (Go):** cent-exact splitting and leftover-cent placement. A sweep over 5,000 amounts × every allowed count checks that each plan adds up to the total and that payments differ by at most one cent. All the validation errors are covered too.
- **`api` (Go):** the HTTP contract end to end through the router, covering the status codes, response bodies, every validation error above, and that `openapi.yaml` documents exactly the routes the server has.
- **`cmd/server` (Go):** the server starts, answers requests, and shuts down cleanly when its context is cancelled.
- **Pure frontend logic (TS):** the reducer, number and currency formatting, history grouping, and parsing of stored history (including corrupted data).
- **`calculatorApi` (TS):** request shapes, response validation, error mapping and retryable errors.
- **UI integration (TS):** the whole app is rendered against a fake backend and driven with clicks and the keyboard. This covers percent, chaining, errors, copy, history (grouping, reuse, clearing, persistence, unavailable storage) and Split in 4 (rounding, validation, retry, focus handling).

CI (`.github/workflows/ci.yml`) runs gofmt, `go vet`, the race detector, ESLint, the TypeScript build and both test suites on every push.

## Design decisions

**Backend**

- **Standard library only.** Go 1.22+ `net/http` routing covers everything this service needs, so it has no third-party dependencies.
- **One endpoint per operation.** `POST /api/v1/divide` is self-describing and easy to call with curl. All arithmetic endpoints share one handler and an operation registry, so adding an operation is a one-line change in `calculator.go`, plus a spec entry that a test enforces.
- **Domain logic separate from HTTP.** `internal/calculator` and `internal/installments` know nothing about HTTP, and `internal/api` only translates between JSON and the domain. This keeps every layer small and easy to test.
- **Money in integer cents.** Floats can't represent most cent amounts exactly, so the installments endpoint takes and returns whole cents. The leftover cents are spread deterministically, so a plan always adds up to its total. The upper limit is 2⁵³−1 cents, the largest integer a JavaScript client can hold exactly.
- **Strict input validation.** Fields are pointers, so a missing `b` is caught instead of silently becoming `0`. Unknown fields, trailing data and bodies over 1 KB are rejected.
- **Finite results only.** `Apply` turns NaN into `UNDEFINED_RESULT` and ±Inf into `RESULT_OUT_OF_RANGE`. Go's JSON encoder cannot encode NaN or Inf, and they aren't meaningful results for a client anyway.
- **Status codes.** 400 means the request is malformed. 422 means the request is valid but has no answer. 404 means the operation doesn't exist.
- **Production basics.** The server has read, write and idle timeouts, structured request logging (`slog`), and graceful shutdown on SIGINT/SIGTERM.

**Frontend**

- **Logic separate from UI.** `calculator/reducer.ts` is a pure state machine that never does arithmetic. `useCalculator` decides when an input needs the backend and dispatches the result. The components only render state.
- **Percent context is a pure function.** `percentageBase(state)` decides what `%` takes a percentage of. The rule is easy to read and is unit-tested on its own.
- **One definition per key.** `calculator/keys.ts` defines each key's label, accessible name, action, style and keyboard shortcuts. The on-screen keypad and keyboard support both read from it, so they can't drift apart.
- **History stays on the client.** Calculations are recorded through an `onCalculated` callback, so the calculator doesn't depend on the history. Grouping into days and chained tapes is a pure function, and stored data is validated on load. Corrupted or unavailable storage degrades to a session-only history instead of crashing.
- **One panel component.** History and Split in 4 share `Panel`, which handles sliding, the backdrop, focus, Escape and inertness in one place. Panels stay mounted so they can animate both in and out.
- **Typed API client.** The client validates response shapes, maps error codes to friendly messages, marks network failures as retryable, and times out after 5 seconds. `useSplit` ignores stale responses, so a slow answer can never overwrite a newer plan.
- **Styling.** CSS modules and CSS custom properties give scoped styles and themes with no UI library. The soft neumorphic look follows the reference design.

## Assumptions and trade-offs

- **Immediate execution, not operator precedence.** `2 + 3 × 4` gives `20`, as on a pocket calculator, rather than `14`. This keeps every backend call a single operation. A precedence-aware expression endpoint would be a natural next step.
- **Percent follows phone calculators.** After `+` or `−`, `%` uses the first number as the base; everywhere else it divides by 100. The API stays general ("a percent of b"), and the context rule lives in the UI.
- **float64 arithmetic.** The calculator operations use float64, so they inherit float64's limits: about 15 significant digits and binary rounding. The UI hides the noise by rounding the display to 15 significant digits, but the full value is kept for later operations. Money is the exception: installments use integer cents.
- **Split in 4 is a planning tool.** Payments are every 14 days starting today, in US dollars, with no fees or interest. Due dates are returned as days from today (`dueInDays`), so the server never has to guess the user's time zone. The browser turns them into dates.
- **History is per browser.** History lives in localStorage, so it isn't shared across devices. Syncing it would need user accounts, which is outside this exercise.
- **Same-origin deployment.** The Vite proxy in development and the Go static server in Docker keep frontend and API on one origin, so the API needs no CORS. Hosting them on different domains would mean adding a CORS middleware.
- **Every operation is a network call.** That is the point of the exercise. In-flight key presses are ignored rather than queued, which keeps state consistent and is not noticeable on a local network.

## AI usage

This project was built with Claude Code. The prompts are in [PROMPTS.md](PROMPTS.md).
