/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandTypes,
  Bot,
  ButtonStyles,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
  MessageComponents,
  MessageComponentTypes,
  MessageFlags,
} from '../deps.ts';
import { InteractionKey, InteractionsDb } from '../services/interactions.ts';
import { Piston } from '../services/piston.ts';
import { log } from '../utils/logger.ts';
import { createCommand } from './mod.ts';

createCommand({
  name: 'Run this as code',
  description: '',
  type: ApplicationCommandTypes.Message,
  scope: 'Global',
  execute: async (bot: Bot, interaction: Interaction) => {
    switch (interaction.type) {
      case InteractionTypes.MessageComponent:
      case InteractionTypes.ApplicationCommand: {
        const message = interaction.data?.resolved?.messages?.first();
        let content = '';
        const isRerun = interaction.type === InteractionTypes.MessageComponent;

        if (isRerun) {
          const { value: codeMessage } = await InteractionsDb.find(
            InteractionKey.Code,
            interaction.message!.id,
          );

          if (!codeMessage) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Unable to re-run the original code.`,
                  flags: MessageFlags.Ephemeral,
                },
              },
            );
            return;
          }

          if (codeMessage.user_id !== interaction.user.id) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ You are not allowed to re-run this code.`,
                  flags: MessageFlags.Ephemeral,
                },
              },
            );
            return;
          }

          try {
            const originalMessage = await bot.helpers.getMessage(
              codeMessage.channel_id,
              codeMessage.message_id,
            );
            content = originalMessage?.content ?? '';
          } catch (err) {
            log.error(err);

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Unable to find original message.`,
                  flags: MessageFlags.Ephemeral,
                },
              },
            );
            return;
          }
        } else {
          content = message?.content ?? '';
        }

        const start = content.indexOf('```') ?? -1;
        const end = content.lastIndexOf('```') ?? -1;

        if (!content || start === -1 || end === -1 || start === end) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: [
                  `❌️ Unable to find code block. Make sure the code is formatted like:`,
                  '\\`\\`\\`language',
                  'code',
                  '\\`\\`\\`',
                ].join('\n'),
                flags: MessageFlags.Ephemeral,
              },
            },
          );
          return;
        }

        const codeBlockStart = content.slice(start + 3);
        const codeStart = codeBlockStart.indexOf('\n');
        const language = codeBlockStart.slice(0, codeStart).toLowerCase();
        const code = codeBlockStart.slice(codeStart + 1, end - 3);
        const runtime = Piston.findRuntime(language);

        if (!runtime) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Language is not supported. List of supported languages:\n` +
                  Piston.Runtimes.map((runtime) => `\`${runtime.language}\``)
                    .join(', '),
                flags: MessageFlags.Ephemeral,
              },
            },
          );
          return;
        }

        let buttons: MessageComponents | undefined = undefined;

        const rerunButtons: MessageComponents = [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.Button,
                label: 'Re-Run',
                customId: 'Run this as code',
                style: ButtonStyles.Primary,
              },
            ],
          },
        ];

        try {
          if (isRerun) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.UpdateMessage,
                data: {
                  content: `☁️ Running code...`,
                  components: [],
                },
              },
            );

            buttons = rerunButtons;
          } else {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `☁️ Running code...`,
                },
              },
            );

            const responseMessage = await bot.helpers
              .getOriginalInteractionResponse(interaction.token);

            if (message) {
              const savedResult = await InteractionsDb.insert(
                InteractionKey.Code,
                {
                  interaction_message_id: responseMessage.id,
                  guild_id: message.guildId,
                  channel_id: message.channelId,
                  message_id: message.id,
                  user_id: message.author.id,
                },
              );

              if (savedResult.ok) {
                buttons = rerunButtons;
              }
            }
          }

          const result = await Piston.execute(runtime, code);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: [
                ...(result.compile && result.compile.code !== 0
                  ? [
                    `Error:`,
                    '```',
                    result.compile.output,
                    '```',
                  ]
                  : []),
                `Output:`,
                '```',
                result.run.output,
                '```',
                `Code: ${result.run.code}`,
              ].join('\n').slice(0, 2_000),
              components: buttons,
            },
          );
        } catch (err) {
          log.error(err);

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
