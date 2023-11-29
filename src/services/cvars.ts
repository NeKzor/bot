/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from '../utils/logger.ts';
import { db } from './db.ts';

export enum FCVAR {
  NONE = 0,
  UNREGISTERED = (1 << 0),
  DEVELOPMENTONLY = (1 << 1),
  GAMEDLL = (1 << 2),
  CLIENTDLL = (1 << 3),
  HIDDEN = (1 << 4),
  PROTECTED = (1 << 5),
  SPONLY = (1 << 6),
  ARCHIVE = (1 << 7),
  NOTIFY = (1 << 8),
  USERINFO = (1 << 9),
  PRINTABLEONLY = (1 << 10),
  UNLOGGED = (1 << 11),
  NEVER_AS_STRING = (1 << 12),
  REPLICATED = (1 << 13),
  CHEAT = (1 << 14),
  SS = (1 << 14),
  DEMO = (1 << 16),
  DONTRECORD = (1 << 17),
  SS_ADDED = (1 << 18),
  RELEASE = (1 << 19),
  RELOAD_MATERIALS = (1 << 20),
  RELOAD_TEXTURES = (1 << 21),
  NOT_CONNECTED = (1 << 22),
  MATERIAL_SYSTEM_THREAD = (1 << 23),
  ARCHIVE_XBOX = (1 << 24),
  ACCESSIBLE_FROM_THREADS = (1 << 25),
  NETWORKSYSTEM = (1 << 26),
  VPHYSICS = (1 << 27),
  SERVER_CAN_EXECUTE = (1 << 28),
  SERVER_CANNOT_QUERY = (1 << 29),
  CLIENTCMD_CAN_EXECUTE = (1 << 30),
}

const flags: [FCVAR, string][] = [
  [FCVAR.UNREGISTERED, 'unregistered'],
  [FCVAR.DEVELOPMENTONLY, 'developmentonly'],
  [FCVAR.GAMEDLL, 'gamedll'],
  [FCVAR.CLIENTDLL, 'clientdll'],
  [FCVAR.HIDDEN, 'hidden'],
  [FCVAR.PROTECTED, 'protected'],
  [FCVAR.SPONLY, 'sponly'],
  [FCVAR.ARCHIVE, 'archive'],
  [FCVAR.NOTIFY, 'notify'],
  [FCVAR.USERINFO, 'userinfo'],
  [FCVAR.PRINTABLEONLY, 'printableonly'],
  [FCVAR.UNLOGGED, 'unlogged'],
  [FCVAR.NEVER_AS_STRING, 'never_as_string'],
  [FCVAR.REPLICATED, 'replicated'],
  [FCVAR.CHEAT, 'cheat'],
  [FCVAR.SS, 'ss'],
  [FCVAR.DEMO, 'demo'],
  [FCVAR.DONTRECORD, 'dontrecord'],
  [FCVAR.SS_ADDED, 'ss_added'],
  [FCVAR.RELEASE, 'release'],
  [FCVAR.RELOAD_MATERIALS, 'reload_materials'],
  [FCVAR.RELOAD_TEXTURES, 'reload_textures'],
  [FCVAR.NOT_CONNECTED, 'not_connected'],
  [FCVAR.MATERIAL_SYSTEM_THREAD, 'material_system_thread'],
  [FCVAR.ARCHIVE_XBOX, 'archive_xbox'],
  [FCVAR.ACCESSIBLE_FROM_THREADS, 'accessible_from_threads'],
  [FCVAR.NETWORKSYSTEM, 'networksystem'],
  [FCVAR.VPHYSICS, 'vphysics'],
  [FCVAR.SERVER_CAN_EXECUTE, 'server_can_execute'],
  [FCVAR.SERVER_CANNOT_QUERY, 'server_cannot_query'],
  [FCVAR.CLIENTCMD_CAN_EXECUTE, 'clientcmd_can_execute'],
];

export enum OperatingSystem {
  Windows,
  Linux,
  Both,
}

export interface CVar {
  name: string;
  default: string;
  flags: number;
  system: OperatingSystem;
  help: string;
}

export const CVars = {
  Api: {
    Base: 'https://raw.githubusercontent.com/NeKzor/cvars/api',
    SAR: 'https://raw.githubusercontent.com/p2sr/SourceAutoRecord/master/docs/cvars.md',
  },
  Portal2: [] as CVar[],

  async load() {
    const cvars: CVar[] = [];

    for await (const cvar of db.list<CVar>({ prefix: ['cvars'] })) {
      cvars.push(cvar.value);
    }

    this.Portal2 = cvars.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  },

  async fetch() {
    const gameMods = [
      'portal-2',
    ];

    for (const gameMod of gameMods) {
      const url = `${this.Api.Base}/${gameMod}.json`;
      log.info(`[GET] ${url}`);

      const res = await fetch(url, {
        headers: {
          'User-Agent': Deno.env.get('USER_AGENT')!,
        },
      });

      log.info(`Fetched ${gameMod} cvars`);

      const json = await res.json() as { Cvars: CVar[] };

      for (const cvar of json.Cvars) {
        await db.set(['cvars', cvar.name], cvar);
      }
    }

    const url = this.Api.SAR;
    log.info(`[GET] ${url}`);

    const sar = await fetch(url, {
      headers: {
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
    });

    log.info(`Fetched SAR cvars`);

    const sarMd = (await sar.text()).split('\n').slice(4);

    for (const line of sarMd) {
      const [name, cvarDefault, help] = line.slice(1, -1).split('|');

      await db.set(['cvars', name], {
        name,
        default: cvarDefault ?? '',
        flags: 0,
        system: OperatingSystem.Both,
        help: (help?.replaceAll('<br>', ' ') ?? '').trim(),
      });
    }

    await this.load();
  },

  *getFlags(cvar: CVar) {
    for (const [flag, name] of flags) {
      if (cvar.flags & flag) {
        yield name;
      }
    }
  },

  getOs(cvar: CVar) {
    switch (cvar.system) {
      case OperatingSystem.Windows:
        return 'Windows';
      case OperatingSystem.Linux:
        return 'Linux';
      case OperatingSystem.Both:
        return 'Windows/Linux';
    }
  },
};
