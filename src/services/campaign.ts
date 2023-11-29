/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

export interface Map {
  name: string;
  cm_name: string;
  best_time_id: string;
  best_portals_id: string;
  three_letter_code: string;
  elevator_timing: string;
  map_filter: number;
  sort_index: number;
}

export const Campaign = {
  Portal2: {
    Maps: [] as Map[],
  },

  async load() {
    const { map_list } = JSON.parse(
      await Deno.readTextFile('./data/portal2_campaign.json'),
    );
    this.Portal2.Maps = map_list;
  },
};
