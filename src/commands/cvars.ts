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
import { escapeMarkdown } from '../utils/helpers.ts';
import { CVars } from '../services/cvars.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';

export const findCvar = createAutocompletion({
  items: () => CVars.Portal2,
  idKey: 'name',
  nameKey: 'name',
  splitCharacter: '_',
});

createCommand({
  name: 'cvars',
  description: 'Find a console command or variable.',
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
              choices: findCvar({ query, isAutocomplete: true })
                .map((cvar) => {
                  return {
                    name: cvar.name,
                    value: cvar.name,
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

        const cvars = findCvar({ query, isAutocomplete: false });
        const cvar = cvars.at(0);

        if (!cvar) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Console command not found.`,
                flags: 1 << 6,
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
                content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                flags: 1 << 6,
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
                `Default Value: ${escapeMarkdown(cvar.default ?? '-')}`,
                `Flags: ${flags.length ? escapeMarkdown(flags.join(' | ')) : '-'}`,
                `OS: ${CVars.getOs(cvar)}`,
                `Description: ${escapeMarkdown(cvar.help)}`,
              ].join('\n'),
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
