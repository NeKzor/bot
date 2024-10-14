FROM denoland/deno:2.0.0

WORKDIR /app

COPY . .
RUN deno install -e src/main.ts

CMD ["deno", "task", "prod"]
