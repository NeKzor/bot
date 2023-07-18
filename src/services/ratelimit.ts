/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { RateLimiterMemory } from "npm:rate-limiter-flexible";

export type RateLimitBucketKey = "reportBug";

export const RateLimit = {
  buckets: {
    reportBug: new RateLimiterMemory({
      points: 3,
      duration: 15 * 60,
    }),
  } as Record<RateLimitBucketKey, RateLimiterMemory>,

  async checkUser(
    bucketKey: RateLimitBucketKey,
    userId: bigint,
    tokensToRemove = 1,
  ) {
    try {
      const bucket = RateLimit.buckets[bucketKey];
      await bucket.consume(userId.toString(), tokensToRemove);
      return true;
    } catch {
      return false;
    }
  },
};
