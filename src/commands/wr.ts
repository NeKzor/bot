/*
 * Copyright (c) 2023-2024, NeKz
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
  MessageFlags,
} from '@discordeno/bot';
import { createCommand } from './mod.ts';
import { escapeMaskedLink, formatCmTime } from '../utils/helpers.ts';
import { log } from '../utils/logger.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';
import { Campaign } from '../services/campaign.ts';

const findWr = createAutocompletion({
  items: () =>
    Campaign.Portal2.Maps
      .filter(({ best_time_id }) => best_time_id),
  additionalCheck: (map, query) => {
    return map.three_letter_code.toLowerCase() === query;
  },
  idKey: 'best_time_id',
  nameKey: 'cm_name',
});

createCommand({
  name: 'wr',
  description: 'Get the latest wr video on autorender.portal2.sr.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'query',
      description: 'Search query.',
      type: ApplicationCommandOptionTypes.String,
      autocomplete: true,
      required: true,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const command = interaction.data!;
    const args = [...(command.options?.values() ?? [])];

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = args.find((arg) => arg.name === 'query')?.value?.toString()?.toLowerCase() ?? '';

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
            data: {
              choices: findWr({ query, isAutocomplete: true })
                .map((map) => {
                  return {
                    name: map.cm_name,
                    value: map.best_time_id,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        const query = args.find((arg) => arg.name === 'query')?.value?.toString()?.toLowerCase() ?? '';

        const wrMaps = findWr({ query, isAutocomplete: false });
        const wrMap = wrMaps.at(0);

        if (!wrMap) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Map not found.`,
                flags: MessageFlags.Ephemeral,
              },
            },
          );
          return;
        }

        if (wrMaps.length > 1) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                flags: MessageFlags.Ephemeral,
              },
            },
          );
          return;
        }

        try {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `Fetching latest wr...`,
              },
            },
          );

          const q = encodeURIComponent(`wr ${query}`);

          const url = `https://autorender.portal2.sr/api/v1/search?q=${q}`;
          log.info(`[GET] ${url}`);

          const res = await fetch(url, {
            headers: {
              'User-Agent': Deno.env.get('USER_AGENT')!,
            },
          });

          if (!res.ok) {
            throw new Error(
              `Failed to fetch videos on autorender.portal2.sr with query: ${q}`,
            );
          }

          interface SearchResponse {
            end: false;
            results: {
              comment: string;
              cur_rank: number;
              date: string;
              id: number;
              map: string;
              map_id: number;
              obsoleted: number;
              orig_rank: number;
              time: number;
              user: string;
              user_id: string;
              views: number;
            }[];
          }

          const search = await res.json() as SearchResponse;

          const wr = search.results.at(0);
          if (!wr) {
            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: `❌️ Video not found.`,
              },
            );
            return;
          }

          const map = escapeMaskedLink(wr.map);
          const mapLink = escapeMaskedLink(
            `https://board.portal2.sr/chamber/${wr.map_id}`,
          );

          const time = escapeMaskedLink(formatCmTime(wr.time));
          const videoLink = `https://autorender.portal2.sr/video.html?v=${wr.id}`;

          const playerName = escapeMaskedLink(wr.user);
          const profileLink = `https://board.portal2.sr/profile/${wr.user_id}`;

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `[${map}](<${mapLink}>) in [${time}](${videoLink}) by [${playerName}](<${profileLink}>)`,
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to fetch videos.`,
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
