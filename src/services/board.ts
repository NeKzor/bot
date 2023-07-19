/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from '../utils/logger.ts';

export interface ChamberData {
  scoreData: {
    note: string;
    submission: string;
    changelogId: string;
    playerRank: string;
    scoreRank: string;
    score: string;
    date: string;
    hasDemo: string;
    youtubeID: string;
    pending: string;
  };
  userData: {
    boardname: string;
    avatar: string;
  };
}

export interface AggregatedData {
  userData: {
    boardname: string;
    avatar: string;
  };
  scoreData: {
    score: number;
    playerRank: number;
    scoreRank: number;
  };
}

export type AggregationType = 'sp' | 'coop' | 'overall';

export interface ChangelogOptions {
  boardName?: string;
  profileNumber?: string;
  chapter?: string;
  chamber?: string;
  startDate?: string;
  endDate?: string;
  startRank?: number;
  endRank?: number;
  sp?: number;
  coop?: number;
  wr?: number;
  demo?: number;
  yt?: number;
  submission?: string;
  pending?: number;
}

export interface ChangelogEntry {
  player_name: string;
  avatar: string;
  profile_number: string;
  score: string;
  id: string;
  pre_rank: string;
  post_rank: string;
  wr_gain: string;
  time_gained: string;
  hasDemo: string;
  youtubeID: string | null;
  note: string;
  banned: string;
  submission: string;
  pending: string;
  previous_score: string | null;
  chamberName: string;
  chapterId: string;
  mapid: string;
  improvement: number;
  rank_improvement: number | null;
  pre_points: number | null;
  post_point: number | null;
  point_improvement: number | null;
}

export const Board = {
  BaseApi: 'https://board.portal2.sr',

  async getChamber(chamberId: number) {
    const url = `${Board.BaseApi}/chamber/${chamberId}/json`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chamber ${chamberId}`);
    }

    return await res.json() as Record<string, ChamberData>;
  },

  async getAggregated(type: AggregationType) {
    const url = `${Board.BaseApi}/aggregated/${type}/json`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch aggregated ${type}`);
    }

    return await res.json() as {
      Points: Record<string, AggregatedData>;
      Times: Record<string, AggregatedData>;
    };
  },

  async getChangelog(options?: ChangelogOptions) {
    const params = new URLSearchParams();

    Object.entries(options ?? {}).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, value.toString());
      }
    });

    const query = params.toString();

    const url = `${Board.BaseApi}/changelog/json?${query}`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch changelog ${query}`);
    }

    return await res.json() as ChangelogEntry[];
  },
};
