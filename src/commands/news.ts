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
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import { Portal2Apps, Steam } from "../services/steam.ts";
import { log } from "../utils/logger.ts";

const maximumAutocompleteResults = 5;

const findApp = (
  { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
) => {
  if (query.length === 0) {
    return Portal2Apps.slice(0, maximumAutocompleteResults);
  }

  const exactMatch = Portal2Apps.find((app) =>
    app.name.toLowerCase() === query
  );
  if (exactMatch) {
    return [exactMatch];
  }

  const results = [];

  for (const app of Portal2Apps) {
    if (!isAutocomplete && app.value === query) {
      return [app];
    }

    const name = app.name.toLocaleLowerCase();

    if (name.startsWith(query) || name.split(" ").includes(query)) {
      results.push(app);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "news",
  description: "Get the latest news about a Steam game or app.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Global",
  options: [
    {
      name: "query",
      description: "Search query.",
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
        const query = args.find((arg) =>
          arg.name === "query"
        )?.value?.toString()?.toLowerCase() ?? "";

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
        const query = args.find((arg) =>
          arg.name === "query"
        )?.value?.toString() ?? "";

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
                  flags: 1 << 6,
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
                content:
                  `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                flags: 1 << 6,
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
          const newsLink = news.links.at(0);

          const content = Steam.formatFeedEntryToMarkdown(
            entry,
            appName,
            newsLink,
          );

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content,
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
