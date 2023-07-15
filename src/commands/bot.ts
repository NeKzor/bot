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
} from "../deps.ts";
import { CVars } from "../services/cvars.ts";
import { Exploits } from "../services/exploits.ts";
import { LP } from "../services/lp.ts";
import { Piston } from "../services/piston.ts";
import { SAR } from "../services/sar.ts";
import { SpeedrunCom } from "../services/speedruncom.ts";
import { createCommand } from "./mod.ts";

const startTime = Date.now();

const services = {
  "CVars": () => CVars.fetch,
  "SpeedrunCom": () => SpeedrunCom.fetch,
  "Piston": () => Piston.fetch,
  "SAR": () => SAR.fetch,
  "LP": () => LP.fetch,
  "Exploits": () => Exploits.load,
};

createCommand({
  name: "bot",
  description: "Bot specific commands.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Global",
  options: [
    {
      name: "info",
      description: "Get info about the bot!",
      type: ApplicationCommandOptionTypes.SubCommand,
    },
    {
      name: "reload",
      description: "Reload bot data!",
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: "service",
          description: "The service to reload.",
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
        .find((arg) => arg.name === name)?.value?.toString()?.trim() ?? "";
    };

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        switch (subCommand.name) {
          case "reload": {
            // TODO: Permissions
            const hasPermission = [BigInt("84272932246810624")].includes(
              interaction.user.id,
            );

            if (!hasPermission) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content:
                      `❌️ You do not have the permissions to use this command.`,
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
                type:
                  InteractionResponseTypes.ApplicationCommandAutocompleteResult,
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
          case "info": {
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
                  ].join("\n"),
                  flags: 1 << 6,
                },
              },
            );
            break;
          }
          case "reload": {
            const service = getArg("service");

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `🤖️ Reloading bot data...`,
                  flags: 1 << 6,
                },
              },
            );

            try {
              const tryFetch = (fetchFunc: () => Promise<void>) => async () => {
                try {
                  await fetchFunc();
                  return true;
                } catch (err) {
                  console.error(err);
                }
                return false;
              };

              if (service) {
                const toReload = services[service as keyof typeof services];
                if (!toReload) {
                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content:
                        `❌️ Unknown service. Please choose a result from autocompletion.`,
                    },
                  );
                  return;
                }

                const result = await tryFetch(toReload())();

                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: [
                      `🤖️ Reloaded service ${service}: ${
                        result ? "success" : "failed"
                      }`,
                    ].join("\n"),
                  },
                );
              } else {
                const toReload = Object.entries(services);
                const results = await Promise.all(
                  toReload.map(([_, func]) => tryFetch(func())()),
                );

                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: [
                      `🤖️ Reloaded bot data.`,
                      results.map((result, index) => {
                        return `${toReload[index].at(0)}: ${
                          result ? "success" : "failed"
                        }`;
                      }).join("\n"),
                    ].join("\n"),
                  },
                );
              }
            } catch (err) {
              console.error(err);

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
