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
import { escapeMaskedLink } from "../utils/helpers.ts";
import Portal2Exploits from "../data/portal2_exploits.json" assert {
  type: "json",
};

type ExploitWithId = typeof Portal2Exploits["0"] & { id: string };

const maximumAutocompleteResults = 5;

Portal2Exploits.forEach((exploit, idx) => {
  (exploit as ExploitWithId).id = idx.toString();

  // Search optimization
  exploit.aliases = exploit.aliases.map((alias) => alias.toLowerCase());
});

const findExploit = (
  { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
) => {
  if (query.length === 0) {
    return Portal2Exploits.slice(0, maximumAutocompleteResults);
  }

  const results = [];

  for (const exploit of Portal2Exploits) {
    if (!isAutocomplete && (exploit as ExploitWithId).id === query) {
      return [exploit];
    }

    const name = exploit.name.toLowerCase();

    if (
      name.startsWith(query) ||
      name.split(" ").includes(query) ||
      exploit.aliases.some((alias) => {
        return alias === query;
      })
    ) {
      results.push(exploit);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "glitch",
  description: "Find a glitch on wiki.portal2.sr or nekz.me/glitches.",
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
              choices: findExploit({ query, isAutocomplete: true })
                .map((exploit) => {
                  return {
                    name: exploit.name,
                    value: (exploit as ExploitWithId).id,
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

        const exploits = findExploit({ query, isAutocomplete: false });
        const exploit = exploits.at(0);

        if (!exploit) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Glitch not found.`,
                flags: 1 << 6,
              },
            },
          );
          return;
        }

        if (exploits.length > 1) {
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

        const name = exploit.wiki
          ? `[${escapeMaskedLink(exploit.name)}](<${exploit.wiki}>)`
          : exploit.name;

        const video = exploit.wiki
          ? `[Watch Showcase](<${exploit.showcase}>)`
          : `[Showcase](<${exploit.showcase})`;

        const description = exploit.overview ? `\n${exploit.overview}` : "";

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
              content: `${name}${description}\n${video}`,
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
