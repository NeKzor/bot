# NeKzBot

Current Version: 3.0.0 | Last Update: Jul 2023

## Introduction

NeKzBot is a [Discord] chatbot created for the [Portal 2 Speedrunning]
community.

| Command       | Description                                             |
| ------------- | ------------------------------------------------------- |
| `/agg`        | Get the aggregated challenge mode leaderboards.         |
| `/bhop`       | Find a bhop level.                                      |
| `/bot info`   | Print info about the bot.                               |
| `/bot reload` | Reload bot data.                                        |
| `/cvars`      | Find a console command.                                 |
| `/delete`     | Delete specific bot data.                               |
| `/demo info`  | Get information about a demo.                           |
| `/glitch`     | Find an entry about a glitch.                           |
| `/lb`         | Get the challenge mode leaderboard.                     |
| `/lp`         | Find the current least portals record.                  |
| `/manage`     | Manage custom roles and auditor webhook.                |
| `/news`       | Get the latest news about a Steam game or app.          |
| `/report bug` | Report a bug to a specific project.                     |
| `/ris`        | Convert text to regional indicator symbols.             |
| `/role`       | Get a custom role.                                      |
| `/update`     | Update specific bot data.                               |
| `/wr`         | Get a video of the current challenge mode world record. |

[Discord]: https://discord.com
[Portal 2 Speedrunning]: https://discord.gg/p2sr

## Versions

| Version       | Release       |
| ------------- | ------------- |
| 3.0.0         | [10 Jul 2023] |
| 2.0.0         | [8 Oct 2017]  |
| 1.9.1         | 23 May 2017   |
| 1.9.0         | 3 May 2017    |
| 1.7.0         | 25 Mar 2017   |
| 1.6.0         | 21 Mar 2017   |
| 1.5.0         | 7 Mar 2017    |
| 1.4.0         | 26 Feb 2017   |
| 1.3.0         | 28 Jan 2017   |
| 1.8.0         | 23 Apr 2017   |
| 1.2.0         | 17 Jan 2017   |
| 1.1.0         | 8 Jan 2017    |
| 1.0.0-selfbot | 29 Sep 2017   |
| 1.0.0         | 26 Dec 2016   |

[10 Jul 2023]: https://github.com/NeKzor/bot/commit/1b3c7c129c7e1467dd3c18fb3192fb48d43cd529
[8 Oct 2017]: https://github.com/NeKzor/NeKzBot/commit/95c18cf97f3c95485cbf3f621afde819d516f1e2

## Dependencies

| Dependency              | Description                   |
| ----------------------- | ----------------------------- |
| [discordeno]            | Discord application framework |
| [sdp]                   | Demo parser                   |
| [ed25519]               | SAR data encoding             |
| [rss]                   | Parsing RSS feed              |
| [deno_dom]              | Parsing HTML content          |
| [temporal-polyfill]     | Date calculations             |
| [rate-limiter-flexible] | Rate limiter                  |

[discordeno]: https://github.com/discordeno/discordeno
[sdp]: https://github.com/NeKzor/sdp
[ed25519]: https://github.com/paulmillr/noble-ed25519
[rss]: https://github.com/MikaelPorttila/rss
[deno_dom]: https://github.com/b-fuze/deno-dom
[temporal-polyfill]: https://github.com/js-temporal/temporal-polyfill
[rate-limiter-flexible]: https://github.com/animir/node-rate-limiter-flexible
