# Development

Steps for developing or self-hosting the bot.

## Requirements

- [deno runtime](https://deno.com/runtime)

## Steps

- Configure `src/.env` by copying the example file: `cp src/.env.example src/.env`
  - `DISCORD_BOT_TOKEN` - Bot token of the Discord application
  - `DISCORD_BOT_ID` - Bot ID of the Discord application
  - `DISCORD_USER_ID` - User ID of the bot owner
  - Optional: `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token
- Start the bot with `deno task dev`

## Scripts

- Configure `scripts/.env` by copying the example file: `cp scripts/.env.example scripts/.env`
  - `STEAM_NEWS_SEND` - Sends the post if it is new (should be disabled at first execution to populate the database)
  - `STEAM_NEWS_DISCORD_WEBHOOK_URL` - The Webhook URL for posting the news
  - `BOARD_STATS_SEND` - Sends the post if it matched the weekly update time
  - `BOARD_STATS_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the stats
