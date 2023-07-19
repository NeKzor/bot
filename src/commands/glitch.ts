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
} from '../deps.ts';
import { createCommand } from './mod.ts';
import { escapeMaskedLink } from '../utils/helpers.ts';
import { Exploits } from '../services/exploits.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';

export const findExploit = createAutocompletion({
  items: () => Exploits.List,
  idKey: 'name',
  nameKey: 'name',
  additionalCheck: (exploit, query) => {
    return exploit.aliases.some((alias) => {
      return alias === query;
    });
  },
});

createCommand({
  name: 'glitch',
  description: 'Find a glitch on wiki.portal2.sr or nekz.me/glitches.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'query',
      description: 'Search query.',
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
        const query = args.find((arg) => arg.name === 'query')?.value?.toString()?.toLowerCase() ?? '';

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
                    value: exploit.name,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        const query = args.find((arg) => arg.name === 'query')?.value?.toString() ?? '';

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
                content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                flags: 1 << 6,
              },
            },
          );
          return;
        }

        const name = exploit.wiki ? `[${escapeMaskedLink(exploit.name)}](<${exploit.wiki}>)` : exploit.name;

        const video = exploit.wiki
          ? `[Watch Showcase](<${exploit.showcase}>)`
          : exploit.showcase
          ? `[Showcase](<${exploit.showcase}>)`
          : '';

        const description = exploit.overview ? `\n${exploit.overview}` : '';

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
