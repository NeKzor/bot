/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

Deno.mkdirSync('./kv', { recursive: true });

export const db = await Deno.openKv('./kv/.kv');
