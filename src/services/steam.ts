/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";
import { log } from "../utils/logger.ts";

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
    const url = `${Steam.BaseApi}/feeds/news/app/${appId}`;
    log.info(url);

    const res = await fetch(url, {
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
