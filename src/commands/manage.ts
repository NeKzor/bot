/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandOptionChoice,
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  BitwisePermissionFlags,
  Bot,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
} from '../deps.ts';
import { createCommand } from './mod.ts';
import { log } from '../utils/logger.ts';
import { findRole } from './role.ts';
import { CustomRoles } from '../services/roles.ts';
import { hasPermissionFlags } from '../utils/helpers.ts';

createCommand({
  name: 'manage',
  description: 'Manage something.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Guild',
  options: [
    {
      name: 'roles',
      description: 'Manage custom roles.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'create',
          description: 'Create a new custom role.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'Name of the new custom role.',
              type: ApplicationCommandOptionTypes.String,
              required: true,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Remove an existing custom role.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'Name of the custom role.',
              type: ApplicationCommandOptionTypes.String,
              autocomplete: true,
              required: true,
            },
          ],
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
    const guildId = interaction.guildId!;

    if (!hasPermissionFlags(interaction.member?.permissions, BitwisePermissionFlags.MANAGE_ROLES)) {
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

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        switch (subCommand.name) {
          case 'roles': {
            switch (subSubCommand.name) {
              case 'delete': {
                const query = args.find((arg) => arg.name === 'name')?.value?.toString()?.toLowerCase() ?? '';

                await bot.helpers.sendInteractionResponse(
                  interaction.id,
                  interaction.token,
                  {
                    type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                    data: {
                      choices: findRole({ query, isAutocomplete: true, context: { guildId } })
                        .map((role) => {
                          return {
                            name: role.name,
                            value: role.role_id.toString(),
                          } as ApplicationCommandOptionChoice;
                        }),
                    },
                  },
                );
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
      case InteractionTypes.ApplicationCommand: {
        switch (subCommand.name) {
          case 'roles': {
            switch (subSubCommand.name) {
              case 'create': {
                try {
                  await bot.helpers.sendInteractionResponse(
                    interaction.id,
                    interaction.token,
                    {
                      type: InteractionResponseTypes.ChannelMessageWithSource,
                      data: {
                        content: `🎉️ Creating custom roles...`,
                        flags: 1 << 6,
                      },
                    },
                  );

                  const query = getArg('name');
                  const roles = findRole({ query, isAutocomplete: false, context: { guildId } });

                  const role = roles.at(0);
                  if (role) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ Custom role already added.`,
                      },
                    );
                    return;
                  }

                  const guildRoles = await bot.helpers.getRoles(interaction.guildId!);
                  const guildRole = guildRoles.find((guildRole) => guildRole.name === query);

                  if (!guildRole) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ The role does not exist on this server.`,
                      },
                    );
                    return;
                  }

                  const { ok } = await CustomRoles.insert({
                    role_id: guildRole.id,
                    guild_id: guildRole.guildId,
                    name: guildRole.name,
                  });

                  if (!ok) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ Failed to save custom role.`,
                      },
                    );
                    return;
                  }

                  await CustomRoles.load();

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `🎉️ Created custom role: \`${guildRole.name}\``,
                    },
                  );
                } catch (err) {
                  log.error(err);

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to create custom role.`,
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
                        content: `🎉️ Deleting custom roles...`,
                        flags: 1 << 6,
                      },
                    },
                  );

                  const query = getArg('name');

                  const roles = findRole({ query, isAutocomplete: false, context: { guildId } });
                  const role = roles.at(0);

                  if (!role) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ Role not found.`,
                      },
                    );
                    return;
                  }

                  if (roles.length > 1) {
                    await bot.helpers.editOriginalInteractionResponse(
                      interaction.token,
                      {
                        content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                      },
                    );
                    return;
                  }

                  await CustomRoles.remove(role);
                  await CustomRoles.load();

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `🎉️ Deleted custom role: \`${role.name}\``,
                    },
                  );
                } catch (err) {
                  log.error(err);

                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to delete custom role.`,
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
