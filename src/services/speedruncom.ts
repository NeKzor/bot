/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from '../utils/logger.ts';
import { db } from './db.ts';

export interface SpeedrunLevel {
  id: string;
  name: string;
  weblink: string;
  rules: string;
  links: {
    rel: string;
    uri: string;
  }[];
}

export interface SpeedrunRecord {
  weblink: string;
  game: string;
  category: string;
  level: string;
  platform: null;
  region: null;
  emulators: null;
  'video-only': boolean;
  timing: null;
  values: Record<string, unknown>;
  runs: [
    {
      place: number;
      run: {
        id: string;
        weblink: string;
        game: string;
        level: string;
        category: string;
        videos: null;
        comment: string;
        status: {
          status: string;
          examiner: string;
          'verify-date': string;
        };
        players: [
          {
            rel: string;
            id: string;
            uri: string;
          },
        ];
        date: string;
        submitted: string;
        times: {
          primary: string;
          primary_t: number;
          realtime: string;
          realtime_t: number;
          realtime_noloads: null;
          realtime_noloads_t: number;
          ingame: null;
          ingame_t: number;
        };
        system: {
          platform: string;
          emulated: boolean;
          region: null;
        };
        splits: null;
        values: Record<string, unknown>;
      };
    },
    {
      place: 2;
      run: {
        id: string;
        weblink: string;
        game: string;
        level: string;
        category: string;
        videos: null;
        comment: string;
        status: {
          status: string;
          examiner: string;
          'verify-date': string;
        };
        players: [
          {
            rel: string;
            id: string;
            uri: string;
          },
        ];
        date: string;
        submitted: string;
        times: {
          primary: string;
          primary_t: number;
          realtime: string;
          realtime_t: number;
          realtime_noloads: null;
          realtime_noloads_t: number;
          ingame: null;
          ingame_t: number;
        };
        system: {
          platform: string;
          emulated: boolean;
          region: null;
        };
        splits: null;
        values: Record<string, unknown>;
      };
    },
  ];
  links: [
    {
      rel: string;
      uri: string;
    },
    {
      rel: string;
      uri: string;
    },
    {
      rel: string;
      uri: string;
    },
  ];
}

export interface User {
  id: string;
  names: {
    international: string;
    japanese: null;
  };
  supporterAnimation: false;
  pronouns: null;
  weblink: string;
  'name-style': {
    style: string;
    'color-from': {
      light: string;
      dark: string;
    };
    'color-to': {
      light: string;
      dark: string;
    };
  };
  role: string;
  signup: string;
  location: null;
  twitch: {
    uri: string;
  };
  hitbox: null;
  youtube: null;
  twitter: null;
  speedrunslive: null;
  assets: {
    icon: {
      uri: null;
    };
    supporterIcon: null;
    image: {
      uri: null;
    };
  };
  links: [
    {
      rel: string;
      uri: string;
    },
    {
      rel: string;
      uri: string;
    },
    {
      rel: string;
      uri: string;
    },
    {
      rel: string;
      uri: string;
    },
  ];
}

export const SpeedrunCom = {
  Portal2Bhop: {
    Id: 'v1pxk8p6',
    Levels: [] as SpeedrunLevel[],
  },

  async load() {
    const key = [
      'speedrun_com',
      'games',
      this.Portal2Bhop.Id,
      'level',
    ];

    const levels = [];

    for await (const level of db.list<SpeedrunLevel>({ prefix: key })) {
      levels.push(level.value);
    }

    this.Portal2Bhop.Levels = levels;
  },
  async fetch() {
    const url = `https://www.speedrun.com/api/v1/games/${this.Portal2Bhop.Id}/levels`;

    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    log.info('Fetched speedrun.com data');

    const key = [
      'speedrun_com',
      'games',
      this.Portal2Bhop.Id,
      'level',
    ];

    const levels = await res.json() as { data: SpeedrunLevel[] };

    // TODO: I think this is wrong...
    await db.delete(key);

    for (const level of levels.data) {
      await db.set([...key, level.id], level);
    }

    await this.load();
  },
  async getRecords(level: SpeedrunLevel) {
    const link = level.links.find((link) => link.rel === 'records');
    if (link) {
      try {
        const url = link.uri;
        log.info(`[GET] ${url}`);

        const res = await fetch(url, {
          headers: {
            'User-Agent': Deno.env.get('USER_AGENT')!,
          },
        });
        const records = (await res.json()).data as SpeedrunRecord[];
        return records.filter((record) => record.runs.length > 0);
      } catch (err) {
        log.error(err);
      }
    }
    return [];
  },
  async getUser(userId: string) {
    const url = `https://www.speedrun.com/api/v1/users/${userId}`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });
    return (await res.json()).data as User;
  },
};
