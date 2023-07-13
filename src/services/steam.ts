/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";

export enum SteamAppId {
  Portal2 = 620,
  ApertureTag = 280740,
  ThinkingWithTimeMachine = 286080,
  Portal2CommunityEdition = 440000,
  PortalReloaded = 1255980,
}

export const Steam = {
  BaseApi: "https://store.steampowered.com",

  async getNewsFeed(appId: number) {
    const res = await fetch(`${Steam.BaseApi}/feeds/news/app/${appId}`, {
      headers: {
        "User-Agent": Deno.env.get("USER_AGENT")!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to Steam's news feed for ${appId}`);
    }

    return await parseFeed(await res.text());
  },
};
