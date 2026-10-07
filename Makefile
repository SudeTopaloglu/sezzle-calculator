.PHONY: install backend frontend test lint coverage docker

install:          ## Install frontend dependencies
	cd frontend && npm ci

backend:          ## Run the API on :8080
	cd backend && go run ./cmd/server

frontend:         ## Run the UI on :5173 (proxies /api to :8080)
	cd frontend && npm run dev

test:             ## Run all unit tests
	cd backend && go test ./...
	cd frontend && npm test

lint:             ## Static checks for both layers
	cd backend && go vet ./... && test -z "$$(gofmt -l .)"
	cd frontend && npm run lint && npx tsc --noEmit

coverage:         ## Coverage reports: backend/coverage.html, frontend/coverage/index.html
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out && go tool cover -html=coverage.out -o coverage.html
	cd frontend && npm run coverage

docker:           ## Build and run the full stack on :8080
	docker build -t sezzle-calculator .
	docker run --rm -p 8080:8080 sezzle-calculator
