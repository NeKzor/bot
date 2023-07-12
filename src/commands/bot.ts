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
import { Piston } from "../services/piston.ts";
import { SAR } from "../services/sar.ts";
import { SpeedrunCom } from "../services/speedruncom.ts";
import { createCommand } from "./mod.ts";

const startTime = Date.now();

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
      description: "Reload bot data! This only includes cvars data for now.",
      type: ApplicationCommandOptionTypes.SubCommand,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const subCommand = [...(interaction.data?.options?.values() ?? [])]
      .at(0)!;

    switch (interaction.type) {
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
                },
              },
            );
            break;
          }
          case "reload": {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `🤖️ Reloading bot data...`,
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

              const [cvars, speedrunCom, piston, sar] = await Promise.all([
                tryFetch(CVars.fetch)(),
                tryFetch(SpeedrunCom.fetch)(),
                tryFetch(Piston.fetch)(),
                tryFetch(SAR.fetch)(),
              ]);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: [
                    `🤖️ Reloaded bot data.`,
                    `Cvars: ${cvars ? "success" : "failed"}`,
                    `Bhop: ${speedrunCom ? "success" : "failed"}`,
                    `Piston: ${piston ? "success" : "failed"}`,
                    `SAR: ${sar ? "success" : "failed"}`,
                  ].join("\n"),
                },
              );
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
