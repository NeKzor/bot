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
import { Exploits } from '../services/exploits.ts';
import { log } from '../utils/logger.ts';
import { findExploit } from './glitch.ts';
import { createCommand } from './mod.ts';

createCommand({
  name: 'delete',
  description: 'Delete specific bot data.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'glitch',
      description: 'Delete a glitch.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'name',
          description: 'Name of the glitch.',
          type: ApplicationCommandOptionTypes.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const subCommand = [...(interaction.data?.options?.values() ?? [])]
      .at(0)!;
    const args = [...(subCommand.options?.values() ?? [])];
    const getArg = (name: string) => {
      return args
        .find((arg) => arg.name === name)?.value?.toString()?.trim() ?? '';
    };

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = args.find((arg) => arg.name === 'name')?.value?.toString()?.toLowerCase() ?? '';

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
        switch (subCommand.name) {
          case 'glitch': {
            // TODO: Permissions
            const hasPermission = [BigInt('84272932246810624')].includes(
              interaction.user.id,
            );

            if (!hasPermission) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ You do not have the permissions to use this command.`,
                    flags: 1 << 6,
                  },
                },
              );
              return;
            }

            const name = getArg('name');
            if (!name.length) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Invalid glitch name.`,
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
                  content: `Deleting glitch...`,
                  flags: 1 << 6,
                },
              },
            );

            try {
              const exploit = await Exploits.find(name);
              if (!exploit) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: `❌️ Failed to find glitch. Please choose a result from autocompletion.`,
                  },
                );
                return;
              }

              await Exploits.delete(exploit);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: [
                    `Deleted glitch: ${exploit.name}`,
                  ].join('\n'),
                },
              );
            } catch (err) {
              log.error(err);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `❌️ Failed to delete glitch.`,
                },
              );
            }
            break;
          }
        }
        break;
      }
      default:
        break;
    }
  },
});
