/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandOptionChoice,
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  Bot,
  ButtonComponent,
  ButtonStyles,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
  MessageComponents,
  MessageComponentTypes,
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import {
  escapeMarkdown,
  escapeMaskedLink,
  formatCmTime,
  getDurationSince,
} from "../utils/helpers.ts";
import Portal2Campaign from "../data/portal2_campaign.json" assert {
  type: "json",
};
import { Board } from "../services/board.ts";
import { InteractionKey, InteractionsDb } from "../services/interactions.ts";
import { SAR } from "../services/sar.ts";
import { log } from "../utils/logger.ts";

const maximumAutocompleteResults = 5;
const boardMaps = Portal2Campaign.map_list.filter(({ best_time_id }) =>
  best_time_id
);

const findChamber = (
  { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
) => {
  if (query.length === 0) {
    return boardMaps.slice(0, maximumAutocompleteResults);
  }

  const results = [];

  for (const map of boardMaps) {
    if (!isAutocomplete && map.best_time_id === query) {
      return [map];
    }

    const cmName = map.cm_name.toLocaleLowerCase();
    const tlc = map.three_letter_code.toLocaleLowerCase();

    if (
      cmName.startsWith(query) ||
      cmName.replaceAll(" ", "").startsWith(query) ||
      tlc === query
    ) {
      results.push(map);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "lb",
  description: "Get the leaderboard on board.portal2.sr.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Global",
  options: [
    {
      name: "chamber",
      description: "Search chamber.",
      type: ApplicationCommandOptionTypes.String,
      autocomplete: true,
      required: true,
    },
    {
      name: "player",
      description: "Get the score of a player by name.",
      type: ApplicationCommandOptionTypes.String,
      required: false,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const command = interaction.data!;
    const args = [...(command.options?.values() ?? [])];

    switch (interaction.type) {
      case InteractionTypes.MessageComponent: {
        const [_command, subcommand, changelogId] =
          interaction.data?.customId?.split("_") ?? [];

        switch (subcommand) {
          case "parsedemo": {
            if (!changelogId) {
              break;
            }

            const { value: lbMessage } = await InteractionsDb.find(
              InteractionKey.Leaderboard,
              interaction.message!.id,
            );

            if (!lbMessage) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Unable to parse demo.`,
                    flags: 1 << 6,
                  },
                },
              );
              return;
            }

            if (lbMessage.user_id !== interaction.user.id) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ You are not allowed to parse this demo.`,
                    flags: 1 << 6,
                  },
                },
              );
              return;
            }

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `⏳️ Downloading demo...`,
                },
              },
            );

            try {
              const messageToEdit = await bot.helpers.getMessage(
                lbMessage.channel_id,
                lbMessage.message_id,
              );

              const url = `https://board.portal2.sr/getDemo?id=${changelogId}`;
              log.info(`[GET] ${url}`);

              const demo = await fetch(url, {
                headers: {
                  "User-Agent": Deno.env.get("USER_AGENT")!,
                },
              });

              // Holy, the leaderboard is so bad... let's return 200 when NOT FOUND!!!

              if (
                !demo.ok ||
                demo.headers.get("Content-Type")?.startsWith("text/html")
              ) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content:
                      `❌️ Unable to download demo. The file might not exist.`,
                  },
                );
                return;
              }

              const demoName = new URL(demo.url).pathname.split("/").at(-1);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `🛠️ Parsing demo...`,
                },
              );

              const parts: BlobPart[] = [];
              const encoder = new TextEncoder();

              const buffer = new Uint8Array(await demo.arrayBuffer());

              const _data = await SAR.parseDemo(buffer, (...args) => {
                parts.push(encoder.encode(args.join(" ") + "\n").buffer);
              });

              // Remove last parse demo button
              messageToEdit.components?.at(0)?.components?.splice(-1, 1);

              await bot.helpers.editMessage(
                lbMessage.channel_id,
                lbMessage.message_id,
                {
                  file: {
                    name: `${demoName}.txt`,
                    blob: new Blob(parts, { type: "text/plain" }),
                  },
                  components: messageToEdit.components as MessageComponents,
                },
              );

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `🛠️ Updated message`,
                },
              );
            } catch (err) {
              log.error(err);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content:
                    `❌️ Unable to parse demo. The file might be corrupted.`,
                },
              );
            }
            break;
          }
          default:
            break;
        }
        break;
      }
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = args.find((arg) =>
          arg.name === "chamber"
        )?.value?.toString()?.toLowerCase() ?? "";

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
            data: {
              choices: findChamber({ query, isAutocomplete: true })
                .map((map) => {
                  return {
                    name: map.cm_name,
                    value: map.best_time_id,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        const query = args.find((arg) =>
          arg.name === "chamber"
        )?.value?.toString() ?? "";
        const player =
          args.find((arg) => arg.name === "player")?.value?.toString()
            ?.toLocaleLowerCase() ?? "";

        const chambers = findChamber({ query, isAutocomplete: false });
        const chamber = chambers.at(0);

        if (!chamber) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Chamber not found.`,
                flags: 1 << 6,
              },
            },
          );
          return;
        }

        if (chambers.length > 1) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content:
                  `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                flags: 1 << 6,
              },
            },
          );
          return;
        }

        try {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `Fetching leaderboard...`,
              },
            },
          );

          const lb = await Board.getChamber(
            parseInt(chamber.best_time_id!, 10),
          );

          // Yes, the API returns an object which is not
          // the right thing to return, thanks iVerb :>
          const values = Object.values(lb);
          const wrTime = parseInt(values.at(0)?.scoreData?.score ?? "0", 10);

          let addParseDemoButton = false;

          if (player) {
            const playerEntry = values
              .find(({ userData }) =>
                userData.boardname.toLocaleLowerCase() === player
              );

            if (!playerEntry) {
              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `❌️ Player score not found.`,
                },
              );
              return;
            }

            const { scoreData, userData } = playerEntry;
            const id = scoreData.changelogId;

            const responseMessage = await bot.helpers
              .getOriginalInteractionResponse(interaction.token);

            const savedResult = await InteractionsDb.insert(
              InteractionKey.Leaderboard,
              {
                interaction_message_id: responseMessage.id,
                guild_id: responseMessage.guildId,
                channel_id: responseMessage.channelId,
                message_id: responseMessage.id,
                user_id: interaction.user.id,
              },
            );

            addParseDemoButton = savedResult.ok;

            const playerName = escapeMarkdown(userData.boardname);

            const time = parseInt(scoreData.score, 10);
            const score = formatCmTime(time);
            const rank = scoreData.playerRank;

            const date = scoreData.date;
            const durationSince = getDurationSince(date);
            const g = (value: number) => value === 1 ? "" : "s";
            const duration = durationSince.days
              ? `${durationSince.days} day${g(durationSince.days)}`
              : durationSince.hours
              ? `${durationSince.hours} hours${g(durationSince.hours)}`
              : durationSince.minutes
              ? `${durationSince.minutes} minute${g(durationSince.minutes)} ago`
              : `${durationSince.seconds} second${g(durationSince.seconds)}`;

            const onYouTube = !!scoreData.youtubeID;

            const videoLink = onYouTube
              ? `https://www.youtube.com/watch?v=${scoreData.youtubeID}`
              : `https://autorender.portal2.sr/video.html?v=${id}`;

            const demoLink = `https://board.portal2.sr/getDemo?id=${id}`;

            const diff = wrTime !== time
              ? ` (+${formatCmTime(time - wrTime)} to WR)`
              : "";

            const title = escapeMaskedLink(chamber.cm_name);

            const chamberLink =
              `https://board.portal2.sr/chamber/${chamber.best_time_id}`;

            // FIXME: Do not hard-code these IDs
            const wrEmoji = interaction.guildId === BigInt("146404426746167296")
              ? " <:wr:294282175396839426>"
              : "";

            const buttons: [ButtonComponent, ButtonComponent] | [
              ButtonComponent,
              ButtonComponent,
              ButtonComponent,
            ] = [
              {
                type: MessageComponentTypes.Button,
                label: `Watch on ${onYouTube ? "YouTube" : "autorender"}`,
                style: ButtonStyles.Link,
                url: videoLink,
              },
              {
                type: MessageComponentTypes.Button,
                label: `Download Demo`,
                style: ButtonStyles.Link,
                url: demoLink,
              },
            ];

            if (addParseDemoButton) {
              buttons.push({
                type: MessageComponentTypes.Button,
                label: `Parse Demo`,
                style: ButtonStyles.Secondary,
                customId: `lb_parsedemo_${id}`,
              });
            }

            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: [
                  `[${title}](<${chamberLink}>)`,
                  `Player: ${playerName}`,
                  `Time: ${score}${diff}`,
                  `Rank: ${rank === "1" ? `WR${wrEmoji}` : rank}`,
                  `Date: ${date} (${duration} ago)`,
                ].join("\n"),
                components: [
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: buttons,
                  },
                ],
              },
            );
            return;
          }

          const indexLimit = values
            .findIndex(({ scoreData }) =>
              parseInt(scoreData.playerRank, 10) >= 5
            );

          const entries = values.slice(
            0,
            indexLimit !== -1 ? Math.min(5, indexLimit + 1) : 5,
          );

          const leaderboard = entries.map(({ scoreData, userData }) => {
            const rank = scoreData.playerRank;
            const player = escapeMarkdown(userData.boardname);

            const time = parseInt(scoreData.score, 10);
            const score = formatCmTime(time);

            const videoLink = scoreData.youtubeID
              ? `https://www.youtube.com/watch?v=${scoreData.youtubeID}`
              : `https://autorender.portal2.sr/video.html?v=${scoreData.changelogId}`;

            const diff = wrTime !== time
              ? ` (+${formatCmTime(time - wrTime)})`
              : "";
            return `${rank}\\. ${player} [${score}](<${videoLink}>)${diff}`;
          });

          const title = `${chamber.cm_name} Leaderboard`;

          const chamberLink =
            `https://board.portal2.sr/chamber/${chamber.best_time_id}`;

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `[${title}](<${chamberLink}>)\n${
                leaderboard.join("\n")
              }`,
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to fetch leaderboard.`,
            },
          );
        }
        break;
      }
      default:
        break;
    }
  },
});
