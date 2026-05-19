FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/freshtrack-api ./cmd/api

FROM alpine:3.22
RUN adduser -D -H freshtrack
USER freshtrack
COPY --from=build /bin/freshtrack-api /bin/freshtrack-api
COPY --from=build /src/db /db
EXPOSE 8080
ENTRYPOINT ["/bin/freshtrack-api"]
