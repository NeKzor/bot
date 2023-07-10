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
import { escapeMarkdown } from "../utils/helpers.ts";
import { CVars } from "../services/cvars.ts";

const maximumAutocompleteResults = 5;

const findCvar = ({ query, byId }: { query: string; byId: boolean }) => {
    console.log({ query });
  if (query.length === 0) {
    return CVars.Portal2.slice(0, maximumAutocompleteResults);
  }

  const results = [];

  for (const cvar of CVars.Portal2) {
    if (byId && cvar.id.toString() === query) {
      return [cvar];
    }

    if (
      cvar.name.startsWith(query) ||
      cvar.name.split("_").includes(query)
    ) {
      results.push(cvar);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "cvars",
  description: "Find a console command or variable.",
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
              choices: findCvar({ query, byId: false })
                .map((cvar) => {
                  console.log(cvar);
                  return {
                    name: cvar.name,
                    value: cvar.id.toString(),
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        console.log({ args });
        const query = args.find((arg) =>
          arg.name === "query"
        )?.value?.toString() ?? "";

        const cvars = findCvar({ query, byId: true });
        const cvar = cvars.at(0);

        if (!cvar) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Console command not found.`,
              },
            },
          );
          return;
        }

        if (cvars.length > 1) {
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

        const flags = [...CVars.getFlags(cvar)];

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
              content: [
                `**${escapeMarkdown(cvar.name)}**`,
                `Default Value: ${escapeMarkdown(cvar.default ?? "-")}`,
                `Flags: ${
                  flags.length ? escapeMarkdown(flags.join(" | ")) : "-"
                }`,
                `OS: ${CVars.getOs(cvar)}`,
                `Description: ${escapeMarkdown(cvar.help)}`,
              ].join("\n"),
            },
          },
        );
        break;
      }
      default:
        break;
    }
  },
});
