# Multi-stage Docker build for Gitna Rust Backend
FROM rust:1.82-slim-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/gitna-backend /app/gitna-backend

ENV PORT=4000
EXPOSE 4000

CMD ["/app/gitna-backend"]
