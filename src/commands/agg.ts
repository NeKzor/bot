/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  Bot,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import { escapeMarkdown, formatBoardPoints } from "../utils/helpers.ts";
import { AggregationType, Board } from "../services/board.ts";

createCommand({
  name: "agg",
  description: "Get the aggregated leaderboard on board.portal2.sr.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Global",
  options: [
    {
      name: "sp",
      description:
        "Get the single player aggregated leaderboard on board.portal2.sr.",
      type: ApplicationCommandOptionTypes.SubCommand,
    },
    {
      name: "coop",
      description: "Get the coop aggregated leaderboard on board.portal2.sr.",
      type: ApplicationCommandOptionTypes.SubCommand,
    },
    {
      name: "overall",
      description:
        "Get the overall aggregated leaderboard on board.portal2.sr.",
      type: ApplicationCommandOptionTypes.SubCommand,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const subCommand = [...(interaction.data?.options?.values() ?? [])]
      .at(0)!;

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommand: {
        const aggregationType = subCommand.name as AggregationType;

        if (!["sp", "coop", "overall"].includes(aggregationType)) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Invalid aggregation type.`,
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

          const agg = await Board.getAggregated(aggregationType);

          // Yes, the API returns an object which is not
          // the right thing to return, thanks iVerb :>
          const values = Object.values(agg.Points);

          const indexLimit = values
            .findIndex(({ scoreData }) => scoreData.playerRank >= 5);

          const entries = values.slice(
            0,
            indexLimit !== -1 ? Math.min(5, indexLimit + 1) : 5,
          );

          const recordPoints = entries.at(0)?.scoreData?.score ?? 0;

          const leaderboard = entries.map(({ scoreData, userData }) => {
            const rank = scoreData.playerRank;
            const player = escapeMarkdown(userData.boardname);
            const score = formatBoardPoints(scoreData.score);

            const diff = recordPoints !== scoreData.score
              ? ` (+${formatBoardPoints(recordPoints - scoreData.score)})`
              : "";

            return `${rank}\\. ${player} ${score}${diff}`;
          });

          const title = (() => {
            switch (aggregationType) {
              case "sp":
                return "Single Player";
              case "coop":
                return "Cooperative";
              case "overall":
                return "Overall";
              default:
                return "";
            }
          })();

          const aggregatedLink =
            `https://board.portal2.sr/aggregated/${aggregationType}`;

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `[${title} Leaderboard](<${aggregatedLink}>)\n${
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
