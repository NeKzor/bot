/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { db } from "./db.ts";

export interface InteractionMessage {
  interaction_message_id: bigint;
  guild_id: bigint | undefined;
  channel_id: bigint;
  message_id: bigint;
  user_id: bigint;
}

export enum InteractionKey {
  Code = "code",
  Leaderboard = "lb",
}

export const InteractionsDb = {
  async insert(interactionKey: InteractionKey, message: InteractionMessage) {
    const key = [interactionKey, message.interaction_message_id];

    return await db.atomic()
      .check({ key, versionstamp: null })
      .mutate({
        type: "set",
        key,
        value: message,
      })
      .commit();
  },
  async find(
    key: InteractionKey,
    messageId: InteractionMessage["interaction_message_id"],
  ) {
    return await db.get<InteractionMessage>([key, messageId]);
  },
};
