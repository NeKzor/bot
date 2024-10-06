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
- Start the bot with `deno task dev`

Data of all services can be populated manually with `/bot reload`. This happens
automatically every 15 minutes after the bot started.

### Portal 2 Steam News (optional)

- `STEAM_NEWS_ENABLE` - Enable or disable news
- `STEAM_NEWS_DISCORD_WEBHOOK_URL` - The Webhook URL for posting the news

### Portal 2 Weekly CM Recap (optional)

- `BOARD_STATS_ENABLE` - Enable or disable stats
- `BOARD_STATS_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the stats

### Speedrun.com Notifications (optional)

- `SRCOM_ENABLE` - Enable or disable notifications
- `SRCOM_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the notifications
- `SRCOM_PHPSESSID` - Session cookie of speedrun.com user account

### GitHub Access (optional)

- `GITHUB_ENABLE` - Enable or disable GitHub access
- `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token for fetching public repositories
- `GITHUB_APP_ID` - GitHub application ID for creating issues
- `GITHUB_CLIENT_ID` - GitHub application client ID
- `GITHUB_CLIENT_SECRET` - GitHub application client secret
- `GITHUB_ORG_NAME` - Name of organisation where the app is installed
- `GITHUB_APP_PRIVATE_KEY_PATH` - Path to the private key file of the installed app
