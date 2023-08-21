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
} from '@discordeno/bot';
import { createCommand } from './mod.ts';

const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
];

const convertTextToRis = (text: string) => {
  let lines = 1;
  let content = '';

  for (const c of text) {
    let ris = '';
    if (c === ' ') {
      ris = '          ';
    } else if (c === '\n') {
      ris = c;
    } else if (/^[a-zA-Z]/.test(c)) {
      ris = `:regional_indicator_${c.toLocaleLowerCase()}:`;
    } else if (/^[0-9]/.test(c)) {
      ris = `:{${numbers[parseInt(c, 10)]}:`;
    } else if (c === '!') {
      ris = ':exclamation:';
    } else if (c === '?') {
      ris = ':question:';
    } else {
      continue;
    }

    if (ris === '\n' && (++lines > 4)) {
      continue;
    }

    if (content.length + ris.length > 2_000) {
      break;
    } else {
      content += ris;
    }
  }

  return content;
};

createCommand({
  name: 'ris',
  description: 'Hmm?',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'text',
      description: 'Text to convert.',
      type: ApplicationCommandOptionTypes.String,
      required: true,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const args = [...(interaction.data?.options?.values() ?? [])];
    const text = args.find((arg) => arg.name === 'text')?.value as string ?? '';
    const ris = convertTextToRis(text);

    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: ris.length ? ris : convertTextToRis('hmm?'),
        },
      },
    );
  },
});
