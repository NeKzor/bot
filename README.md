[![docs](https://github.com/NeKzor/bot/actions/workflows/docs.yml/badge.svg)](https://github.com/NeKzor/bot/actions/workflows/docs.yml)

# p2sr-bot

## Commands

A preview of each command can be seen on [bot.nekz.me/commands].

| Command       | Description                                             |
| ------------- | ------------------------------------------------------- |
| `/agg`        | Get the aggregated challenge mode leaderboards.         |
| `/bhop`       | Find a bhop level.                                      |
| `/bot info`   | Print info about the bot.                               |
| `/bot reload` | Reload bot data.                                        |
| `/cvars`      | Find a console command.                                 |
| `/delete`     | Delete specific bot data.                               |
| `/demo info`  | Get information about a demo.                           |
| `/gh branch`  | Find GitHub branch.                                     |
| `/gh issue`   | Find GitHub issue.                                      |
| `/gh pr`      | Find GitHub pull request.                               |
| `/gh release` | Find GitHub release.                                    |
| `/glitch`     | Find an entry about a glitch.                           |
| `/lb`         | Get the challenge mode leaderboard.                     |
| `/lp`         | Find the current least portals record.                  |
| `/manage`     | Manage auditor webhook.                                 |
| `/news`       | Get the latest news about a Steam game or app.          |
| `/report bug` | Report a bug to a specific project.                     |
| `/ris`        | Convert text to regional indicator symbols.             |
| `/update`     | Update specific bot data.                               |
| `/wr`         | Get a video of the current challenge mode world record. |

[bot.nekz.me/commands]: https://bot.nekz.me/commands

## Contributing

### Requirements

- [deno runtime] | [Reference](https://deno.land/manual)
- [Discord Application] | [Reference](https://discord.com/developers/docs/getting-started)

[deno runtime]: https://deno.com/runtime
[Discord Application]: https://discord.com/developers/applications

### Start

- Configure `.env` by copying the example file: `cp .env.example .env`
  - `DISCORD_BOT_TOKEN` - Bot token of the Discord application
  - `DISCORD_BOT_ID` - Bot ID of the Discord application
  - `DISCORD_USER_ID` - User ID of the bot owner
- Start the bot with `deno task dev`

Data of all services can be populated manually with `/bot reload`. This happens
automatically every 15 minutes after the bot started.

#### Portal 2 Steam News (optional)

- `STEAM_NEWS_ENABLE` - Enable or disable news
- `STEAM_NEWS_DISCORD_WEBHOOK_URL` - The Webhook URL for posting the news

#### Portal 2 Weekly CM Recap (optional)

- `BOARD_STATS_ENABLE` - Enable or disable stats
- `BOARD_STATS_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the stats

#### Speedrun.com Notifications (optional)

- `SRCOM_ENABLE` - Enable or disable notifications
- `SRCOM_DISCORD_WEBHOOK_URL` -The Webhook URL for posting the notifications
- `SRCOM_PHPSESSID` - Session cookie of speedrun.com user account

#### GitHub Access (optional)

- `GITHUB_ENABLE` - Enable or disable GitHub access
- `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token for fetching public repositories
- `GITHUB_APP_ID` - GitHub application ID for creating issues
- `GITHUB_CLIENT_ID` - GitHub application client ID
- `GITHUB_CLIENT_SECRET` - GitHub application client secret
- `GITHUB_ORG_NAME` - Name of organisation where the app is installed
- `GITHUB_APP_PRIVATE_KEY_PATH` - Path to the private key file of the installed app

## Dependencies

| Dependency              | Description                   |
| ----------------------- | ----------------------------- |
| [discordeno]            | Discord application framework |
| [sdp]                   | Demo parser                   |
| [ed25519]               | SAR data decoding             |
| [rss]                   | Parsing RSS feed              |
| [deno-dom]              | Parsing HTML content          |
| [rate-limiter-flexible] | Rate limiter                  |

[discordeno]: https://github.com/discordeno/discordeno
[sdp]: https://github.com/NeKzor/sdp
[ed25519]: https://github.com/paulmillr/noble-ed25519
[rss]: https://github.com/MikaelPorttila/rss
[deno-dom]: https://github.com/b-fuze/deno-dom
[rate-limiter-flexible]: https://github.com/animir/node-rate-limiter-flexible
[discordeno]: https://github.com/discordeno/discordeno

## Credits

[NeKzBot v2]

[NeKzBot v2]: https://github.com/NeKzor/NeKzBot

## License

[MIT License](./LICENSE)
