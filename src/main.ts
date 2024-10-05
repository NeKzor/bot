/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'dotenv/load.ts';

import { loadAllServices } from './services/mod.ts';
import { logger } from './utils/logger.ts';
import { updateCommands } from './utils/helpers.ts';
import { bot } from './bot.ts';

// TODO: file logging
const log = logger({ name: 'Main' });

addEventListener('error', (ev) => {
  console.dir({ error: ev.error }, { depth: 16 });
});

addEventListener('unhandledrejection', (ev) => {
  ev.preventDefault();

  console.dir({ unhandledrejection: ev.reason }, { depth: 16 });

  if (ev.reason?.body) {
    Deno.stdout.writeSync(new TextEncoder().encode(ev.reason.body));
  }
});

log.info('Using User-Agent:', Deno.env.get('USER_AGENT')!);
log.info('Starting bot...');

await loadAllServices();

await import('./commands/agg.ts');
await import('./commands/bhop.ts');
await import('./commands/bot.ts');
await import('./commands/cvars.ts');
await import('./commands/delete.ts');
await import('./commands/demo.ts');
await import('./commands/glitch.ts');
await import('./commands/lb.ts');
await import('./commands/lp.ts');
await import('./commands/manage.ts');
await import('./commands/news.ts');
await import('./commands/ris.ts');
await import('./commands/run.ts');
await import('./commands/update.ts');
await import('./commands/wr.ts');

if (Deno.env.get('GITHUB_ACCESS_TOKEN') !== 'false') {
  await import('./commands/gh.ts');
  await import('./commands/report.ts');
}

await import('./events/guildAuditLogEntryCreate.ts');
await import('./events/guildCreate.ts');
await import('./events/interactionCreate.ts');
await import('./events/ready.ts');

await updateCommands(bot);

log.info('Running bot...');

await bot.start();
