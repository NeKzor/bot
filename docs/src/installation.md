# Installation

Installation steps for developing or self-hosting the bot:

- Make sure the [deno runtime](https://deno.com/runtime) is installed
- `git clone https://github.com/NeKzor/bot`
- `cd bot/src`
- `cp .env.example .env`
- Configure `.env`
  - `DISCORD_BOT_TOKEN` - Bot token of the Discord application
  - `DISCORD_BOT_ID` - Bot ID of the Discord application
  - `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token
- Start the bot with `deno task dev`
- Populate the database by executing `/bot reload` in Discord
