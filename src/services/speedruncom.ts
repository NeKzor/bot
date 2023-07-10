/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

export interface Level {
  id: string;
  name: string;
  weblink: string;
  rules: string;
  links: {
    rel: string;
    uri: string;
  }[];
}

export const SpeedrunCom = {
  Portal2Bhop: {
    Id: "v1pxk8p6",
    Levels: [] as Level[],
  },

  async load() {
    SpeedrunCom.Portal2Bhop.Levels = JSON.parse(
      await Deno.readTextFile("./data/speedruncom_p2bh.json"),
    );
  },
  async fetch() {
    const res = await fetch(
      `https://www.speedrun.com/api/v1/games/${SpeedrunCom.Portal2Bhop.Id}/levels`,
    );

    await Deno.writeTextFile(
      "./data/speedruncom_p2bh.json",
      JSON.stringify((await res.json()).data),
    );

    console.log("Fetched speedrun.com data");

    await SpeedrunCom.load();
  },
};
