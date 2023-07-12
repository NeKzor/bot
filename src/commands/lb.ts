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
  ButtonStyles,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
  MessageComponentTypes,
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import {
  escapeMarkdown,
  formatCmTime,
  getDurationSince,
} from "../utils/helpers.ts";
import Portal2Campaign from "../data/portal2_campaign.json" assert {
  type: "json",
};
import { Board } from "../services/board.ts";

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
      name: "query",
      description: "Search query.",
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
        console.log("TODO");
        break;
      }
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = args.find((arg) =>
          arg.name === "query"
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
          arg.name === "query"
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
            const playerName = escapeMarkdown(userData.boardname);

            const time = parseInt(scoreData.score, 10);
            const score = formatCmTime(time);
            const rank = scoreData.playerRank;

            const date = scoreData.date;
            const durationSince = getDurationSince(date);
            const g = (value: number) => value === 1 ? '' : 's';
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

            const diff = wrTime !== time
              ? ` (+${formatCmTime(time - wrTime)} to WR)`
              : "";

            const title = `${playerName} on ${chamber.cm_name}`;

            const chamberLink =
              `https://board.portal2.sr/chamber/${chamber.best_time_id}`;

            // FIXME: Do not hard-code these IDs
            const wrEmoji = interaction.guildId === BigInt("146404426746167296")
              ? " <:wr:294282175396839426>"
              : "";

            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: [
                  `[${title}](<${chamberLink}>)`,
                  `Time: ${score}${diff}`,
                  `Rank: ${rank === "1" ? `WR${wrEmoji}` : rank}`,
                  `Date: ${date} (${duration} ago)`,
                ].join("\n"),
                components: [
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: [
                      {
                        type: MessageComponentTypes.Button,
                        label: `Watch on ${
                          onYouTube ? "YouTube" : "autorender"
                        }`,
                        style: ButtonStyles.Link,
                        url: videoLink,
                      },
                      {
                        type: MessageComponentTypes.Button,
                        label: `Download Demo`,
                        style: ButtonStyles.Link,
                        url: `https://board.portal2.sr/getDemo?id=${id}`,
                      },
                      // {
                      //   type: MessageComponentTypes.Button,
                      //   label: `Parse Demo`,
                      //   style: ButtonStyles.Primary,
                      //   customId: `lb_parsedemo_${id}`,
                      // },
                    ],
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
          console.error(err);

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