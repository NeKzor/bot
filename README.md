[![docs](https://github.com/NeKzor/bot/actions/workflows/docs.yml/badge.svg)](https://github.com/NeKzor/bot/actions/workflows/docs.yml)

# NeKzBot v3

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

# TODO

- ~~Migrate all data into Deno kv~~
- ~~Fix autocomplete search algorithm~~
- ~~Add script to auto fetch latest data~~
- ~~Add script to post latest news~~
- ~~Add update commands for glitches~~
- ~~Compare data to mdp~~
- ~~Fix sdp + parse CM data~~
- ~~Add rate limiter~~
- ~~Add permission checks~~
- Document new commands
- ~~Migrate discordeno to v19~~

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
