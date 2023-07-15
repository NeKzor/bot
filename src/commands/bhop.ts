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
import { SpeedrunCom } from "../services/speedruncom.ts";
import { escapeMarkdown } from "../utils/helpers.ts";
import { log } from "../utils/logger.ts";

const maximumAutocompleteResults = 5;

const findLevel = ({ query, byId }: { query: string; byId: boolean }) => {
  if (query.length === 0) {
    return SpeedrunCom.Portal2Bhop.Levels.slice(0, maximumAutocompleteResults);
  }

  const results = [];

  for (const level of SpeedrunCom.Portal2Bhop.Levels) {
    if (byId && level.id.toString() === query) {
      return [level];
    }

    const name = level.name.toLowerCase();

    if (
      name.startsWith(query) ||
      name.split(" ").includes(query)
    ) {
      results.push(level);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "bhop",
  description: "Find a bhop level.",
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
              choices: findLevel({ query, byId: false })
                .map((cvar) => {
                  return {
                    name: cvar.name,
                    value: cvar.id,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        try {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `🐇️ Searching for bhop level...`,
              },
            },
          );

          const args = [...(command.options?.values() ?? [])];

          const query = args.find((arg) =>
            arg.name === "query"
          )?.value?.toString() ?? "";

          const levels = findLevel({ query, byId: true });
          const level = levels.at(0);

          if (!level) {
            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: `❌️ Level not found.`,
              },
            );
            return;
          }

          if (levels.length > 1) {
            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content:
                  `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
              },
            );
            return;
          }

          const records = await SpeedrunCom.getRecords(level);
          const formatted: string[] = [];

          for (const record of records) {
            const url = new URL(record.weblink);

            const wr = record.runs.at(0);
            if (!wr) {
              continue;
            }

            const wrHolders = record.runs
              .filter((run) => run.place === 1);

            const wrHoldersFormatted = [];

            for (const { run } of wrHolders) {
              for (const player of run.players) {
                const user = await SpeedrunCom.getUser(player.id);
                wrHoldersFormatted.push(
                  `[${user.names.international}](<${user.weblink}>)`,
                );
              }
            }

            formatted.push(
              `[${
                url.hash.slice(1)
              }](<${record.weblink}>) | ${wr.run.times.primary_t} by ${
                wrHoldersFormatted.join(", ")
              }`,
            );
          }

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: [
                `🐇️ ${escapeMarkdown(level.name)}`,
                formatted.join("\n"),
                ``,
                `${escapeMarkdown(level.rules.trim())}`,
              ].join("\n"),
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to find bhop level.`,
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
