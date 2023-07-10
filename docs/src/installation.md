# Installation

Requires [deno](https://deno.com/runtime).

- `git clone https://github.com/NeKzor/bot`
- `cd bot/src`
- `cp .env.example .env`
- Configure `.env`
  - `DISCORD_BOT_TOKEN` - Bot token of the Discord application
  - `DISCORD_BOT_ID` - Bot ID of the Discord application
  - `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token
- `deno task dev`
