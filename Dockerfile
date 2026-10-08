# Builds the frontend and backend, then serves both from one small image:
# the Go server hosts the API and the static React build on the same origin.

FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.27-alpine AS backend
WORKDIR /src
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /out/server /server
COPY --from=frontend /app/dist /web
ENV PORT=8080 STATIC_DIR=/web
EXPOSE 8080
ENTRYPOINT ["/server"]
