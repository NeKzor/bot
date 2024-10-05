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
import { Portal2Apps, Steam } from '../services/steam.ts';
import { log } from '../utils/logger.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';

const findApp = createAutocompletion({
  items: () => Portal2Apps,
  idKey: 'value',
  nameKey: 'name',
});

createCommand({
  name: 'news',
  description: 'Get the latest news about a Steam game or app.',
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
              choices: findApp({ query, isAutocomplete: true })
                .map((app) => {
                  return {
                    name: app.name,
                    value: app.value,
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

        const apps = findApp({ query, isAutocomplete: false });
        const app = apps.at(0);

        if (!app) {
          const appId = parseInt(query, 10);
          const isCustomAppId = appId.toString() === query;
          const isAppId = (appId % 10) === 0;

          if (!isCustomAppId || !isAppId) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ App not found.`,
                  flags: MessageFlags.Ephemeral,
                },
              },
            );
            return;
          }
        } else if (apps.length > 1) {
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
                content: `Fetching news...`,
              },
            },
          );

          const appId = parseInt(app?.value ?? query, 10);
          const news = await Steam.getNewsFeed(appId);

          const entry = news.entries.at(0);
          if (!entry) {
            await bot.helpers.editOriginalInteractionResponse(
              interaction.token,
              {
                content: `❌️ Failed to find latest entry.`,
              },
            );
            return;
          }

          const appName = app?.name ?? `App ID ${appId}`;
          const link = news.links.at(0);
          const newsLink = entry?.links?.at(0)?.href ?? '';

          const content = Steam.formatFeedEntryToMarkdown(entry, appName, link);

          const truncated = [];
          let charactersLeft = 1_900;
          for (const line of content.split('\n')) {
            charactersLeft -= line.length + 1;
            if (charactersLeft < 0) {
              truncated.push(
                newsLink ? `[Read more](<${newsLink}>)` : '_truncated_',
              );
              break;
            }
            truncated.push(line);
          }

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: content.slice(0, 2_000),
            },
          );
        } catch (err) {
          log.error(err);

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: `❌️ Failed to fetch news.`,
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
