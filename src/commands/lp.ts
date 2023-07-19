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
import { escapeMaskedLink } from '../utils/helpers.ts';
import { LP } from '../services/lp.ts';
import { log } from '../utils/logger.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';
import { Campaign } from '../services/campaign.ts';

const findLp = createAutocompletion({
  items: () =>
    Campaign.Portal2.Maps
      .filter(({ best_portals_id }) => best_portals_id),
  additionalCheck: (map, query) => {
    return map.three_letter_code.toLowerCase() === query;
  },
  idKey: 'best_portals_id',
  nameKey: 'cm_name',
});

createCommand({
  name: 'lp',
  description: 'Find the latest LP record on lp.nekz.me.',
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
              choices: findLp({ query, isAutocomplete: true })
                .map((map) => {
                  return {
                    name: map.cm_name,
                    value: map.best_portals_id,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        const query = args.find((arg) => arg.name === 'query')?.value?.toString() ?? '';

        try {
          const lpMaps = findLp({ query, isAutocomplete: false });
          const lpMap = lpMaps.at(0);

          if (!lpMap) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Map not found.`,
                  flags: 1 << 6,
                },
              },
            );
            return;
          }

          if (lpMaps.length > 1) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                  flags: 1 << 6,
                },
              },
            );
            return;
          }

          const { value: lp } = await LP.find(
            parseInt(lpMap.best_portals_id, 10),
          );

          const lpRecord = lp?.showcases?.at(0);
          if (!lp || !lpRecord) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ LP record not found.`,
                  flags: 1 << 6,
                },
              },
            );
            return;
          }

          const player1 = lpRecord.player.id
            ? `[${escapeMaskedLink(lpRecord.player.name)}](<https://lp.nekz.me/@/${lpRecord.player.id}>)`
            : lpRecord.player?.name ?? null;

          const player2 = lpRecord.player2?.id
            ? `[${escapeMaskedLink(lpRecord.player2.name)}](<https://lp.nekz.me/@/${lpRecord.player2.id}>)`
            : lpRecord.player2?.name ?? null;

          const players = [player1, player2].filter((player) => player).join(
            ' and ',
          );

          const g = (value: number) => value === 1 ? '' : 's';
          const videoLink = `https://www.youtube.com/watch?v=${lpRecord.media}`;

          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `${lpMap!.cm_name} in [${lp.wr} portal${g(lp.wr)}](${videoLink}) by ${players}`,
              },
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `❌️ Failed to find LP record.`,
              },
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
