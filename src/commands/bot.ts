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
            try {
              await CVars.fetch();

              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `🤖️ Reloaded bot data.`,
                  },
                },
              );
            } catch (err) {
              console.error(err);

              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Failed to reload bot data.`,
                  },
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
