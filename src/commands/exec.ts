/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandTypes,
  Bot,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
} from "../deps.ts";
import { Piston } from "../services/piston.ts";
import { escapeMarkdown } from "../utils/helpers.ts";
import { createCommand } from "./mod.ts";

createCommand({
  name: "Run this as code",
  description: "Execute code.",
  type: ApplicationCommandTypes.Message,
  scope: "Global",
  execute: async (bot: Bot, interaction: Interaction) => {
    switch (interaction.type) {
      case InteractionTypes.ApplicationCommand: {
        const content = interaction.data?.resolved?.messages?.first()?.content;

        const start = content?.indexOf("```") ?? -1;
        const end = content?.lastIndexOf("```") ?? -1;

        if (!content || start === -1 || end === -1 || start === end) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: [
                  `❌️ Unable to find code block. Make sure the code is formatted like:`,
                  "\\`\\`\\`language",
                  "code",
                  "\\`\\`\\`",
                ].join("\n"),
              },
            },
          );
          return;
        }

        const codeBlockStart = content.slice(start + 3);
        const codeStart = codeBlockStart.indexOf("\n");
        const language = codeBlockStart.slice(0, codeStart);
        const runtime = Piston.findRuntime(language);

        console.log({ codeBlockStart, codeStart, language, runtime });

        if (!runtime) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Language is not supported.`,
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
              content: `☁️ Executing code...`,
            },
          },
        );

        try {
          const code = codeBlockStart.slice(codeStart + 1, end - 3);
          console.log({ code });

          const result = await Piston.execute(runtime, code);
          console.log({ result });

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: [
                `Code: ${result.run.code}`,
                "```",
                escapeMarkdown(result.run.output),
                "```",
              ].join("\n"),
            },
          );
        } catch (err) {
          console.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to execute code.`,
            },
          );
        }
        break;
      }
    }
  },
});
