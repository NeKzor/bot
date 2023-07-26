/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  Attachment,
  Bot,
  Interaction,
  InteractionResponseTypes,
  MessageFlags,
} from '../deps.ts';
import { SAR } from '../services/sar.ts';
import { escapeMarkdown } from '../utils/helpers.ts';
import { log } from '../utils/logger.ts';
import { createCommand } from './mod.ts';

const MAX_DEMO_FILE_SIZE = 6_000_000;

const getDemoInfo = async (
  bot: Bot,
  interaction: Interaction,
  attachment: Attachment,
) => {
  if (attachment.size > MAX_DEMO_FILE_SIZE) {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: `❌️ File is too big. Parsing is limited to 6 MB.`,
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
      type: InteractionResponseTypes.ChannelMessageWithSource,
      data: {
        content: `⏳️ Downloading demo...`,
      },
    },
  );

  try {
    const url = attachment.url;
    log.info(`[GET] ${url}`);

    const demo = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!demo.ok) {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: `❌️ Unable to download attachment.`,
      });
      return;
    }

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `🛠️ Parsing demo...`,
    });

    const parts: BlobPart[] = [];
    const encoder = new TextEncoder();

    const buffer = new Uint8Array(await demo.arrayBuffer());

    const _data = await SAR.parseDemo(buffer, (...args) => {
      parts.push(encoder.encode(args.join(' ') + '\n').buffer);
    });

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `🛠️ Results for ${escapeMarkdown(attachment.filename)}`,
      files: [
        {
          name: `${attachment.filename}.txt`,
          // deno-lint-ignore no-explicit-any
          blob: new Blob(parts, { type: 'text/plain' }) as any,
        },
      ],
    });
  } catch (err) {
    log.error(err);

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `❌️ Corrupted demo.`,
    });
  }
};

createCommand({
  name: 'Get demo info',
  description: '',
  type: ApplicationCommandTypes.Message,
  scope: 'Global',
  execute: async (bot: Bot, interaction: Interaction) => {
    const attachment = interaction.data?.resolved?.messages?.first()
      ?.attachments?.at(0);

    if (!attachment) {
      await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: `❌️ Unable to get demo info. This message does not have an attached demo file.`,
            flags: MessageFlags.Ephemeral,
          },
        },
      );
      return;
    }

    await getDemoInfo(bot, interaction, attachment);
  },
});

createCommand({
  name: 'demo',
  description: 'Get info about a demo!',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'info',
      description: 'Get info about a demo file!',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'file',
          description: 'Demo file.',
          type: ApplicationCommandOptionTypes.Attachment,
          required: true,
        },
      ],
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const attachment = interaction.data?.resolved?.attachments?.first()!;
    await getDemoInfo(bot, interaction, attachment);
  },
});
