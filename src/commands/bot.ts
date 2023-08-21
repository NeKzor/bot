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
  MessageFlags,
} from '@discordeno/bot';
import { reloadAllServices, reloadService, services } from '../services/mod.ts';
import { log } from '../utils/logger.ts';
import { createCommand } from './mod.ts';

const startTime = Date.now();

createCommand({
  name: 'bot',
  description: 'Bot specific commands.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'info',
      description: 'Get info about the bot!',
      type: ApplicationCommandOptionTypes.SubCommand,
    },
    {
      name: 'reload',
      description: 'Reload bot data!',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'service',
          description: 'The service to reload.',
          type: ApplicationCommandOptionTypes.String,
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
        switch (subCommand.name) {
          case 'reload': {
            const isBotOwner = BigInt(Deno.env.get('DISCORD_USER_ID')!) === interaction.user.id;
            if (!isBotOwner) {
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

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: Object.keys(services).map((service) => ({
                    name: service,
                    value: service,
                  })),
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
      case InteractionTypes.ApplicationCommand: {
        switch (subCommand.name) {
          case 'info': {
            const sec = (Date.now() - startTime) / 1_000;
            const uptime = sec < 60
              ? `${sec.toFixed(2)} seconds`
              : sec < (60 * 60)
              ? `${(sec / 60).toFixed(2)} minutes`
              : sec < (60 * 60 * 24)
              ? `${(sec / (60 * 60)).toFixed(2)} hours`
              : `${(sec / (60 * 60 * 24)).toFixed(2)} days`;

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: [
                    `:robot: [bot.nekz.me](<https://bot.nekz.me>)`,
                    `:small_red_triangle: ${Deno.build.os} ${Deno.build.arch}`,
                    `:up: ${uptime}`,
                  ].join('\n'),
                  flags: MessageFlags.Ephemeral,
                },
              },
            );
            break;
          }
          case 'reload': {
            const service = getArg('service');

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `🤖️ Reloading bot data...`,
                  flags: MessageFlags.Ephemeral,
                },
              },
            );

            try {
              if (service) {
                const toReload = services[service as keyof typeof services];
                if (!toReload) {
                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Unknown service. Please choose a result from autocompletion.`,
                    },
                  );
                  return;
                }

                const result = await reloadService(toReload);

                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: [
                      `🤖️ Reloaded service ${service}: ${result ? 'success' : 'failed'}`,
                    ].join('\n'),
                  },
                );
              } else {
                const toReload = Object.entries(services);
                const results = await reloadAllServices();

                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: [
                      `🤖️ Reloaded bot data.`,
                      results.map((result, index) => {
                        return `${toReload[index].at(0)}: ${result ? 'success' : 'failed'}`;
                      }).join('\n'),
                    ].join('\n'),
                  },
                );
              }
            } catch (err) {
              log.error(err);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `❌️ Failed to reload bot data.`,
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
