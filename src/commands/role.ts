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
import { log } from '../utils/logger.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';
import { CustomRole, CustomRoles } from '../services/roles.ts';

export const findRole = createAutocompletion<CustomRole, { guildId: bigint }>({
  items: (context) => CustomRoles.getCache(context!.guildId),
  idKey: 'role_id',
  nameKey: 'name',
  maxItems: 25,
});

createCommand({
  name: 'role',
  description: 'Get a role.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Guild',
  options: [
    {
      name: 'get',
      description: 'Get a role.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'name',
          description: 'Name of role.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
    },
    {
      name: 'remove',
      description: 'Remove a role.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'name',
          description: 'Name of role.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
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
    const guildId = interaction.guildId!;

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
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
      case InteractionTypes.ApplicationCommand: {
        const isGet = subCommand.name === 'get';

        try {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `🎉️ Updating your roles...`,
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

          const guildRoles = await bot.helpers.getRoles(interaction.guildId!);
          const guildRole = guildRoles.find((guildRole) => guildRole.name === role.name);

          if (!guildRole) {
            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: `❌️ This role is not available anymore.`,
              },
            );
            return;
          }

          const updateRole = isGet ? bot.helpers.addRole : bot.helpers.removeRole;
          const action = isGet ? 'Added' : 'Removed';

          await updateRole(
            interaction.guildId!,
            interaction.user.id,
            guildRole.id!,
            `${action} role via \`/role ${subCommand.name}\`.`,
          );

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `🎉️ ${action} role: \`${role.name}\``,
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to update your roles.`,
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
