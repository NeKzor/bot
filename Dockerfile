FROM denoland/deno:2.0.0-rc.10

WORKDIR /app

COPY . .
RUN deno install -e src/main.ts

CMD ["deno", "task", "prod"]
