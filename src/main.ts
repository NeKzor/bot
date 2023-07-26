/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'https://deno.land/std@0.190.0/dotenv/load.ts';

import {
  ActivityTypes,
  createBot,
  enableCachePlugin,
  enableCacheSweepers,
  fastFileLoader,
  GatewayIntents,
  startBot,
} from './deps.ts';
import { logger } from './utils/logger.ts';
import { events } from './events/mod.ts';
import { updateCommands } from './utils/helpers.ts';
import { loadAllServices } from './services/mod.ts';

// TODO: file logging
const log = logger({ name: 'Main' });

log.info('Using User-Agent:', Deno.env.get('USER_AGENT')!);

log.info('Starting bot');

const paths = ['./events', './commands'];
await fastFileLoader(paths).catch((err) => {
  log.fatal(`Unable to Import ${paths}`);
  log.fatal(err);
  Deno.exit(1);
});

export const bot = enableCachePlugin(
  createBot({
    token: Deno.env.get('DISCORD_BOT_TOKEN')!,
    botId: BigInt(Deno.env.get('DISCORD_BOT_ID')!),
    intents: GatewayIntents.Guilds | (1 << 2),
    events,
  }),
);

// @ts-nocheck: no-updated-depencdencies
enableCacheSweepers(bot);

bot.gateway.manager.createShardOptions.makePresence = (shardId: number) => {
  return {
    shardId,
    status: 'online',
    activities: [
      {
        name: 'portal2_linux',
        type: ActivityTypes.Game,
        createdAt: Date.now(),
      },
    ],
  };
};

// bot.rest.fetched = async (_option, response) => {
//   const res = response.clone();
//   try {
//     console.dir(await res.text(), { depth: 10 });
//   } catch (err) {
//     console.error(err);
//     console.log("response:", await res.text());
//   }
// };

await loadAllServices();
await updateCommands(bot);

log.info('Started bot');

await startBot(bot);
