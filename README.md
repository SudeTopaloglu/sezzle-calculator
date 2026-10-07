# Calculator: React + Go

A full-stack calculator. The React (TypeScript) frontend handles input and display, and every calculation is done by a Go REST microservice.

![Calculator in light and dark mode](docs/screenshot.png)

**Supported operations:** addition, subtraction, multiplication, division, exponentiation, square root and percentage.

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
│   ├── cmd/server/                Entry point: config, HTTP server, graceful shutdown
│   └── internal/
│       ├── calculator/            Pure arithmetic and validation, no HTTP knowledge
│       └── api/                   Routing, JSON decoding and validation, error mapping
├── frontend/                      React + TypeScript (Vite)
│   └── src/
│       ├── api/                   Typed client for the REST API
│       ├── calculator/            Pure logic: state reducer, key layout, number formatting
│       ├── hooks/                 useCalculator (state + API), useKeyboardShortcuts
│       └── components/            Calculator, Display, Keypad (+ CSS modules)
├── Dockerfile                     Multi-stage build: frontend + backend in one 8 MB image
├── Makefile                       Shortcuts for running, testing and building
└── .github/workflows/ci.yml       Lint, test and build on every push
```

## API

Base URL: `http://localhost:8080`

| Method | Path                    | Body             | Description                |
| ------ | ----------------------- | ---------------- | -------------------------- |
| `POST` | `/api/v1/add`           | `{"a": 1, "b": 2}` | a + b                    |
| `POST` | `/api/v1/subtract`      | `{"a": 1, "b": 2}` | a − b                    |
| `POST` | `/api/v1/multiply`      | `{"a": 1, "b": 2}` | a × b                    |
| `POST` | `/api/v1/divide`        | `{"a": 1, "b": 2}` | a ÷ b                    |
| `POST` | `/api/v1/power`         | `{"a": 1, "b": 2}` | a raised to the power b  |
| `POST` | `/api/v1/sqrt`          | `{"a": 9}`         | √a                       |
| `POST` | `/api/v1/percentage`    | `{"a": 50}`        | a ÷ 100                  |
| `GET`  | `/healthz`              |                    | Liveness check           |

Operands are JSON numbers. Binary operations require both `a` and `b`. Unary operations require only `a` and reject `b`.

### Examples

```bash
curl -X POST http://localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": 2, "b": 3}'
# 200 {"operation":"add","a":2,"b":3,"result":5}

curl -X POST http://localhost:8080/api/v1/sqrt -H 'Content-Type: application/json' -d '{"a": 81}'
# 200 {"operation":"sqrt","a":81,"result":9}

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
| 400    | `INVALID_REQUEST`      | Empty or malformed JSON, non-numeric or out-of-range operand, missing operand, unknown field, body over 1 KB |
| 404    | `UNKNOWN_OPERATION`    | The operation in the path does not exist                             |
| 422    | `DIVISION_BY_ZERO`     | `b` is 0 in a division                                               |
| 422    | `NEGATIVE_SQUARE_ROOT` | Square root of a negative number                                     |
| 422    | `UNDEFINED_RESULT`     | The result is not a real number, e.g. `(-8)^0.5`                      |
| 422    | `RESULT_OUT_OF_RANGE`  | The result overflows float64, e.g. `10^400` or `0^-1`                 |

## Using the calculator

It works like a standard pocket calculator. Pressing `=`, `√` or `%` sends a request to the backend. The top line of the display shows the expression (`12 × 3 =`), and the main line shows the number being typed or the result.

| Keyboard              | Action           |
| --------------------- | ---------------- |
| `0`–`9`, `.` or `,`   | Enter a number   |
| `+` `-` `*` (or `x`) `/` `^` | Operators |
| `Enter` or `=`        | Equals           |
| `%`                   | Percent          |
| `r`                   | Square root      |
| `n`                   | Toggle sign (±)  |
| `Backspace`           | Delete last digit |
| `Escape` or `Delete`  | All clear        |

Behavior details:

- **Chaining.** Operations are evaluated left to right as you go: `2 + 3 ×` shows `5 ×`.
- **Changing your mind.** Pressing a second operator replaces the first: `5 + ×` becomes `5 ×`.
- **Repeat operand.** `5 × =` gives `25`, as on most calculators.
- **Unary inside an expression.** `12 + 9 √ =` gives `12 + 3 = 15`.
- **Input limits.** You can type at most 15 digits, which float64 represents exactly, and only one decimal point.
- **Errors.** Errors such as "Cannot divide by zero" or "Service unavailable" appear in the display. The next key press starts fresh.
- **Requests in flight.** Key presses are ignored while a request is in flight, so a double-click on `=` never sends two requests.
- **Display formatting.** Results use thousands separators and are rounded to 15 significant digits, so `0.1 + 0.2` shows `0.3`. Very large and very small numbers switch to scientific notation (`1.5e21`), and long numbers shrink the font to stay on one line.
- **Accessibility and responsiveness.** The UI has a light and dark theme that follows the OS setting. It works at phone widths (tested at 320 px), and every button is reachable with Tab and has an accessible label. The display is an ARIA live region, and animations respect `prefers-reduced-motion`.

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
| Backend  | `internal/api`             | 98.6%    |
| Backend  | `cmd/server`               | 63.2% (`main()` signal wiring is untested; `run()` is tested) |
| Backend  | **Total**                  | **89.5% of statements** |
| Frontend | **All files (71 tests)**   | **99.4% statements, 95.3% branches, 100% functions** |

**What is tested**

- **`calculator` (Go):** every operation, plus the edge cases: division by zero, `0/0`, negative square root, overflow, non-real powers, `-0` normalization, and wrong operand count or NaN/Inf operands.
- **`api` (Go):** the HTTP contract end to end through the router, covering the status codes, response bodies, and every validation error listed above.
- **`cmd/server` (Go):** the server starts, answers requests, and shuts down cleanly when its context is cancelled.
- **`reducer` (TS):** input editing, operator replacement, chaining, unary results, error recovery and digit limits, all tested as pure functions.
- **`calculatorApi` (TS):** request shape, error mapping, network failures and malformed responses.
- **`Calculator` (TS, integration):** clicks and keyboard input run through the real hooks and API client against a fake backend. This also covers the in-flight guard and the error states.

CI (`.github/workflows/ci.yml`) runs gofmt, `go vet`, the race detector, ESLint, the TypeScript build and both test suites on every push.

## Design decisions

**Backend**

- **Standard library only.** Go 1.22+ `net/http` routing (`POST /api/v1/{operation}`) covers everything this service needs, so it has no third-party dependencies.
- **One endpoint per operation.** `POST /api/v1/divide` is self-describing and easy to call with curl. All endpoints share one handler and an operation registry, so adding an operation is a one-line change in `calculator.go`.
- **Domain logic separate from HTTP.** `internal/calculator` knows nothing about HTTP, and `internal/api` only translates between JSON and the domain. This keeps both layers small and easy to test.
- **Strict input validation.** Operands are pointers, so a missing `b` is caught instead of silently becoming `0`. Unknown fields, trailing data and bodies over 1 KB are rejected.
- **Finite results only.** `Apply` turns NaN into `UNDEFINED_RESULT` and ±Inf into `RESULT_OUT_OF_RANGE`. Go's JSON encoder cannot encode NaN or Inf, and they aren't meaningful results for a client anyway.
- **Status codes.** 400 means the request is malformed. 422 means the request is valid but has no mathematical answer. 404 means the operation doesn't exist.
- **Production basics.** The server has read, write and idle timeouts, structured request logging (`slog`), and graceful shutdown on SIGINT/SIGTERM.

**Frontend**

- **Logic separate from UI.** `calculator/reducer.ts` is a pure state machine that never does arithmetic. `useCalculator` decides when an input needs the backend and dispatches the result. The components only render state.
- **One definition per key.** `calculator/keys.ts` defines each key's label, accessible name, action, style and keyboard shortcuts. The on-screen keypad and keyboard support both read from it, so they can't drift apart.
- **Typed API client.** The client validates response shapes, maps API error codes to friendly messages, and times out after 5 seconds.
- **Styling.** CSS modules and CSS custom properties give scoped styles and themes with no UI library. The soft neumorphic look follows the reference design.

## Assumptions and trade-offs

- **Immediate execution, not operator precedence.** `2 + 3 × 4` gives `20`, as on a pocket calculator, rather than `14`. This keeps every backend call a simple binary operation. A precedence-aware expression endpoint would be a natural next step.
- **Percentage is unary.** `%` divides by 100, so `50 %` gives `0.5`. Some calculators treat `a + b%` as "b percent of a", which is less predictable.
- **float64 arithmetic.** The backend uses float64, so it inherits float64's limits: about 15 significant digits and binary rounding. The UI hides the noise by rounding the display to 15 significant digits, but the full value is kept for later operations. A finance-grade calculator would use a decimal type instead.
- **Same-origin deployment.** The Vite proxy in development and the Go static server in Docker keep frontend and API on one origin, so the API needs no CORS. Hosting them on different domains would mean adding a CORS middleware.
- **Every operation is a network call.** That is the point of the exercise. In-flight key presses are ignored rather than queued, which keeps state consistent and is not noticeable on a local network.

## AI usage

This project was built with Claude Code. The prompts are in [PROMPTS.md](PROMPTS.md).
