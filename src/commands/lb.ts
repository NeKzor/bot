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
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import { formatCmTime } from "../utils/helpers.ts";
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
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const command = interaction.data!;
    const args = [...(command.options?.values() ?? [])];

    switch (interaction.type) {
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
          // the right thing to return, thanks ncla :>
          const values = Object.values(lb);

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
            const player = userData.boardname;
            const score = formatCmTime(parseInt(scoreData.score, 10));
            const videoLink = scoreData.youtubeID
              ? `https://www.youtube.com/watch?v=${scoreData.youtubeID}`
              : `https://autorender.portal2.sr/video.html?v=${scoreData.changelogId}`;
            return `${rank}\\. ${player} [${score}](<${videoLink}>)`;
          });

          const chamberLink =
            `https://board.portal2.sr/chamber/${chamber.best_time_id}`;

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `[${chamber.cm_name}](<${chamberLink}>)\n${
                leaderboard.join("\n")
              }`,
            },
          );
        } catch (err) {
          console.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to fetch chamber.`,
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
