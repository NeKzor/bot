/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from '../utils/logger.ts';
import { db } from './db.ts';

export interface LpShowcasePlayer {
  id?: string;
  name: string;
  avatar?: string;
  country?: string;
}

export interface LpShowcase {
  player: LpShowcasePlayer;
  player2?: LpShowcasePlayer;
  date: string;
  media: string;
}

export interface LpRecord {
  id: number;
  name: string;
  mode: number;
  wr: number;
  index: number;
  ties: number;
  showcases: LpShowcase[];
}

export interface LpRecordsResponse {
  data: {
    maps: LpRecord[];
  };
}

export const LP = {
  BaseApi: 'https://lp.nekz.me/api/v1',

  async upsert(record: LpRecord) {
    const key = ['lp', record.id];

    return await db.atomic()
      .mutate({
        type: 'set',
        key,
        value: record,
      })
      .commit();
  },

  async find(id: number) {
    return await db.get<LpRecord>(['lp', id]);
  },

  async fetch() {
    const url = `${LP.BaseApi}/records`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch lp records`);
    }

    const records = await res.json() as LpRecordsResponse;

    for (const record of records.data.maps) {
      LP.upsert(record);
    }
  },
};
