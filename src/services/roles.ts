/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { db } from './db.ts';

export interface CustomRole {
  role_id: bigint;
  guild_id: bigint;
  name: string;
}

export const CustomRoles = {
  Cache: new Map<CustomRole['guild_id'], CustomRole[]>(),

  async load() {
    const cache = new Map<CustomRole['guild_id'], CustomRole[]>();

    const list = await CustomRoles.listAll();

    for (const role of list) {
      const roles = cache.get(role.guild_id);
      if (roles) {
        roles.push(role);
      } else {
        cache.set(role.guild_id, [role]);
      }
    }

    CustomRoles.Cache = cache;
  },
  async insert(role: CustomRole) {
    const key = ['custom_roles', role.guild_id, role.role_id];

    return await db.atomic()
      .check({ key, versionstamp: null })
      .mutate({
        type: 'set',
        key,
        value: role,
      })
      .commit();
  },
  async remove(role: CustomRole) {
    const key = ['custom_roles', role.guild_id, role.role_id];
    await db.delete(key);
  },
  async find(guildId: CustomRole['guild_id'], roleId: CustomRole['role_id']) {
    const key = ['custom_roles', guildId, roleId];
    return await db.get<CustomRole>(key);
  },
  async list(guildId: CustomRole['guild_id']) {
    const result = [];
    const prefix = ['custom_roles', guildId];
    for await (const entry of db.list<CustomRole>({ prefix })) {
      result.push(entry.value);
    }
    return result;
  },
  async listAll() {
    const result = [];
    const prefix = ['custom_roles'];
    for await (const entry of db.list<CustomRole>({ prefix })) {
      result.push(entry.value);
    }
    return result;
  },
  getCache(guildId: CustomRole['guild_id']) {
    return CustomRoles.Cache.get(guildId) ?? [];
  },
};
