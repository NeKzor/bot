/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

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

export const Board = {
  BaseApi: "https://board.portal2.sr",

  async getChamber(chamberId: number) {
    const res = await fetch(`${Board.BaseApi}/chamber/${chamberId}/json`);

    if (!res.ok) {
      throw new Error(`Failed to fetch chamber ${chamberId}`);
    }

    return await res.json() as Record<string, ChamberData>;
  },

  async getAggregated(type: "sp" | "coop" | "overall") {
    const res = await fetch(`${Board.BaseApi}/aggregated/${type}/json`);

    if (!res.ok) {
      throw new Error(`Failed to fetch aggregated ${type}`);
    }

    return await res.json() as {
      Points: Record<string, AggregatedData>;
      Times: Record<string, AggregatedData>;
    };
  },
};
