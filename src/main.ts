/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { loadAllServices } from './services/mod.ts';
import { logger } from './utils/logger.ts';
import { updateCommands } from './utils/helpers.ts';
import { bot } from './bot.ts';
import { sendWeeklyStats } from './tasks/stats.ts';
import { checkForNews } from './tasks/news.ts';
import { checkForNotifications } from './tasks/srcom.ts';

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

if (Deno.env.get('GITHUB_ENABLE') !== 'false') {
  await import('./commands/gh.ts');
  await import('./commands/report.ts');
}

await import('./events/guildAuditLogEntryCreate.ts');
await import('./events/guildCreate.ts');
await import('./events/interactionCreate.ts');
await import('./events/ready.ts');

await updateCommands(bot);

log.info('Starting crons...');

const steamNewsWebhook = Deno.env.get('STEAM_NEWS_DISCORD_WEBHOOK_URL')!;
const sendSteamNews = Deno.env.get('STEAM_NEWS_ENABLE') === 'true';
if (sendSteamNews && !steamNewsWebhook) {
  log.warn('Environment variable STEAM_NEWS_DISCORD_WEBHOOK_URL not set!');
}

const boardStatsWebhook = Deno.env.get('BOARD_STATS_DISCORD_WEBHOOK_URL')!;
const sendBoardStats = Deno.env.get('BOARD_STATS_ENABLE') === 'true';
if (sendBoardStats && !boardStatsWebhook) {
  log.warn('Environment variable BOARD_STATS_DISCORD_WEBHOOK_URL not set!');
}

const srcomWebhook = Deno.env.get('SRCOM_DISCORD_WEBHOOK_URL')!;
const sendSrcomNotification = Deno.env.get('SRCOM_ENABLE') === 'true';
if (sendSrcomNotification && !srcomWebhook) {
  log.warn('Environment variable SRCOM_DISCORD_WEBHOOK_URL not set!');
}

sendSteamNews && Deno.cron('Portal 2 News', { minute: { every: 5 } }, checkForNews(steamNewsWebhook));

sendBoardStats &&
  Deno.cron('Portal 2 Weekly Stats', { hour: 0, minute: 0, dayOfWeek: 2 }, sendWeeklyStats(boardStatsWebhook));

sendSrcomNotification &&
  Deno.cron('Portal 2 Speedrun Notifications', { minute: { every: 5 } }, checkForNotifications(srcomWebhook));

log.info('Running bot...');

await bot.start();
