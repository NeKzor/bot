[![docs](https://github.com/NeKzor/bot/actions/workflows/docs.yml/badge.svg)](https://github.com/NeKzor/bot/actions/workflows/docs.yml)

# NeKzBot v4

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

### Requirements

- [deno runtime] | [Reference](https://deno.land/manual)
- [Discord Application] | [Reference](https://discord.com/developers/docs/getting-started)

[deno runtime]: https://deno.com/runtime
[Discord Application]: https://discord.com/developers/applications

### Steps

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

## Dependencies

- [discordeno]
- [sdp]

[discordeno]: https://github.com/discordeno/discordeno
[sdp]: https://github.com/NeKzor/sdp

## Credits

[NeKzBot v2]

[NeKzBot v2]: https://github.com/NeKzor/NeKzBot

## License

[MIT License](./LICENSE)
