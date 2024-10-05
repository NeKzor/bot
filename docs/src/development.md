# Development

Steps for developing or self-hosting the bot.

## Requirements

- [deno runtime] | [Reference](https://deno.land/manual)
- [Discord Application] | [Reference](https://discord.com/developers/docs/getting-started)

[deno runtime]: https://deno.com/runtime
[Discord Application]: https://discord.com/developers/applications

## Steps

- Configure `.env` by copying the example file: `cp .env.example .env`
  - `DISCORD_BOT_TOKEN` - Bot token of the Discord application
  - `DISCORD_BOT_ID` - Bot ID of the Discord application
  - `DISCORD_USER_ID` - User ID of the bot owner
  - Optional GitHub:
    - `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token
  - Optional Portal 2 News:
    - `STEAM_NEWS_ENABLE` - Enable or disable news
    - `STEAM_NEWS_DISCORD_WEBHOOK_URL` - The Webhook URL for posting the news
  - Optional Portal 2 CM Board:
    - `BOARD_STATS_ENABLE` - Enable or disable stats
    - `BOARD_STATS_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the stats
  - Optional Speedrun Notifications:
    - `SRCOM_ENABLE` - Enable or disable notifications
    - `SRCOM_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the notifications
    - `SRCOM_PHPSESSID` - Session cookie of speedrun.com user
- Start the bot with `deno task dev`

Data of all services can be populated manually with `/bot reload`. This happens automatically every 15 minutes after the
bot started.
