/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { parseFeed } from 'https://deno.land/x/rss@1.0.0/mod.ts';
import { log } from '../utils/logger.ts';
import { escapeMarkdown, htmlToDiscordMarkdown, HtmlToDiscordMarkdownOptions } from '../utils/helpers.ts';

export enum SteamAppId {
  Portal2 = 620,
  ApertureTag = 280740,
  ThinkingWithTimeMachine = 286080,
  Portal2CommunityEdition = 440000,
  PortalReloaded = 1255980,
}

export const Portal2Apps = [
  {
    name: 'Portal 2',
    value: SteamAppId.Portal2.toString(),
  },
  {
    name: 'Aperture Tag',
    value: SteamAppId.ApertureTag.toString(),
  },
  {
    name: 'Thinking with Time Machine',
    value: SteamAppId.ThinkingWithTimeMachine.toString(),
  },
  {
    name: 'Portal 2: Community Edition',
    value: SteamAppId.Portal2CommunityEdition.toString(),
  },
  {
    name: 'Portal Reloaded',
    value: SteamAppId.PortalReloaded.toString(),
  },
];

export const Steam = {
  BaseApi: 'https://store.steampowered.com',
  htmlConvertOptions: {
    imageFormatter: (src: string) => {
      if (!src) {
        return src;
      }

      // Filter out Steam's responsive YouTube hack
      if (
        src ===
          'https://steamcommunity.com/public/shared/images/responsive/youtube_16x9_placeholder.gif'
      ) {
        return '';
      }

      return `<${src}>`;
    },
  } as HtmlToDiscordMarkdownOptions,

  async getNewsFeed(appId: SteamAppId | number | string) {
    const url = `${Steam.BaseApi}/feeds/news/app/${appId}`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to Steam's news feed for ${appId}`);
    }

    return await parseFeed(await res.text());
  },

  formatFeedEntryToMarkdown(
    entry: Awaited<ReturnType<typeof parseFeed>>['entries']['0'],
    appName: string,
    newsLink?: string,
  ) {
    const date = entry?.published?.toISOString().split('T').at(0);
    const entryTitle = `${appName} News ${date}`;
    const title = escapeMarkdown(entry?.title?.value ?? '');
    const rawDescription = entry?.description?.value ?? '';
    const description = htmlToDiscordMarkdown(
      rawDescription,
      Steam.htmlConvertOptions,
    );
    const link = entry?.links?.at(0)?.href ?? '';
    const author = entry?.author?.name;

    return [
      newsLink ? `[${entryTitle}](<${newsLink}>)` : entryTitle,
      `Published by ${author}`,
      `### [${title}](<${link}>)`,
      description,
    ].join('\n');
  },
};
