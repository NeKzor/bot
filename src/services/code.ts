/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

const db = await Deno.openKv();

interface CodeMessage {
  interaction_message_id: bigint;
  guild_id: bigint | undefined;
  channel_id: bigint;
  message_id: bigint;
  user_id: bigint;
}

export const Code = {
  async saveMessage(message: CodeMessage) {
    return await db.atomic()
      .mutate({
        type: "set",
        key: ["code", message.interaction_message_id],
        value: message,
      })
      .commit();
  },
  async getMessage(message_id: CodeMessage["interaction_message_id"]) {
    return await db.get<CodeMessage>(["code", message_id]);
  },
};
