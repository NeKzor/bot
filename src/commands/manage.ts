/*
 * Copyright (c) 2023-2024, NeKz
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
  MessageFlags,
} from '@discordeno/bot';
import { createCommand } from './mod.ts';
import { log } from '../utils/logger.ts';
import { Auditor } from '../services/auditor.ts';

createCommand({
  name: 'manage',
  description: 'Manage something.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Guild',
  options: [
    {
      name: 'auditor',
      description: 'Manage auditor.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'create',
          description: 'Create and install a new auditor.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'Channel for audit logs.',
              type: ApplicationCommandOptionTypes.Channel,
              required: true,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Delete the currently installed auditor.',
          type: ApplicationCommandOptionTypes.SubCommand,
        },
      ],
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const subCommand = [...(interaction.data?.options?.values() ?? [])]
      .at(0)!;
    const subSubCommand = [...(subCommand.options?.values() ?? [])]
      .at(0)!;
    const args = [...(subSubCommand.options?.values() ?? [])];
    const getArg = (name: string) => {
      return args
        .find((arg) => arg.name === name)?.value?.toString()?.trim() ?? '';
    };

    switch (subCommand.name) {
      case 'auditor': {
        if (!interaction.member?.permissions?.has('VIEW_AUDIT_LOG')) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ You do not have the permissions to use this command.`,
                flags: MessageFlags.Ephemeral,
              },
            },
          );
          return;
        }
        break;
      }
      default:
        break;
    }

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommand: {
        switch (subCommand.name) {
          case 'auditor': {
            switch (subSubCommand.name) {
              case 'create': {
                try {
                  await bot.helpers.sendInteractionResponse(
                    interaction.id,
                    interaction.token,
                    {
                      type: InteractionResponseTypes.ChannelMessageWithSource,
                      data: {
                        content: `🔍️ Creating new auditor...`,
                        flags: MessageFlags.Ephemeral,
                      },
                    },
                  );

                  const auditor = await Auditor.find(interaction.guildId!);
                  if (auditor) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ An existing auditor already exists.`,
                      },
                    );
                    return;
                  }

                  const webhook = await bot.helpers.createWebhook(getArg('channel'), {
                    name: 'Auditor',
                  });

                  await Auditor.save({
                    guildId: interaction.guildId!,
                    url: webhook.url!,
                  });

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `🔍️ Created new auditor.`,
                    },
                  );
                } catch (err) {
                  log.error(err);

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to create auditor.`,
                    },
                  );
                }
                break;
              }
              case 'delete': {
                try {
                  await bot.helpers.sendInteractionResponse(
                    interaction.id,
                    interaction.token,
                    {
                      type: InteractionResponseTypes.ChannelMessageWithSource,
                      data: {
                        content: `🔍️ Deleting auditor...`,
                        flags: MessageFlags.Ephemeral,
                      },
                    },
                  );

                  const auditor = await Auditor.find(interaction.guildId!);
                  if (!auditor) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ Did not find an installed auditor.`,
                      },
                    );
                    return;
                  }

                  await Auditor.remove(auditor);

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `🔍️ Deleted auditor.`,
                    },
                  );
                } catch (err) {
                  log.error(err);

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to delete auditor.`,
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
          default:
            break;
        }
        break;
      }
      default:
        break;
    }
  },
});
