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
import { escapeMarkdown, htmlToDiscordMarkdown } from "../utils/helpers.ts";
import { Steam, SteamAppId } from "../services/steam.ts";

const maximumAutocompleteResults = 5;

const portal2Apps = [
  {
    name: "Portal 2",
    value: SteamAppId.Portal2.toString(),
  },
  {
    name: "Aperture Tag",
    value: SteamAppId.ApertureTag.toString(),
  },
  {
    name: "Thinking with Time Machine",
    value: SteamAppId.ThinkingWithTimeMachine.toString(),
  },
  {
    name: "Portal 2: Community Edition",
    value: SteamAppId.Portal2CommunityEdition.toString(),
  },
  {
    name: "Portal Reloaded",
    value: SteamAppId.PortalReloaded.toString(),
  },
];

const findApp = (
  { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
) => {
  if (query.length === 0) {
    return portal2Apps.slice(0, maximumAutocompleteResults);
  }

  const exactMatch = portal2Apps.find((app) =>
    app.name.toLowerCase() === query
  );
  if (exactMatch) {
    return [exactMatch];
  }

  const results = [];

  for (const app of portal2Apps) {
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
          const newsLink = news.links.at(0);
          const latest = news.entries?.at(0);
          const title = escapeMarkdown(latest?.title?.value ?? "");
          const rawDescription = latest?.description?.value ?? "";
          const description = htmlToDiscordMarkdown(rawDescription);
          const link = latest?.links?.at(0)?.href ?? "";
          const date = latest?.published?.toISOString().split("T").at(0);
          const author = latest?.author?.name;
          const appName = app?.name ?? `App ID ${appId}`;

          await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
              content: [
                `[${appName} News ${date}](<${newsLink}>)`,
                `Published by ${author}`,
                `### [${title}](<${link}>)`,
                description,
              ].join("\n"),
            },
          );
        } catch (err) {
          console.error(err);

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
