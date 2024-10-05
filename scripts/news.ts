/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'dotenv/load.ts';

import { Portal2Apps, Steam } from '../src/services/steam.ts';
import { log } from '../src/utils/logger.ts';

const NEWS_UPDATE_INTERVAL = 5 * 60 * 1_000;
const STEAM_NEWS_DISCORD_WEBHOOK_URL = Deno.env.get(
  'STEAM_NEWS_DISCORD_WEBHOOK_URL',
)!;
const STEAM_NEWS_SEND = Deno.env.get('STEAM_NEWS_SEND') === 'true';

if (!STEAM_NEWS_DISCORD_WEBHOOK_URL) {
  log.error('Environment variable STEAM_NEWS_DISCORD_WEBHOOK_URL not set!');
  Deno.exit(1);
}

if (!STEAM_NEWS_SEND) {
  log.warn('Running check without sending messages.');
  log.warn(
    'Turn on environment variable STEAM_NEWS_SEND once the data is populated in the database.',
  );
}

const db = await Deno.openKv();

const apps = Portal2Apps.filter((app) => app.name === 'Portal 2');

const checkForNews = async () => {
  for (const app of apps) {
    try {
      log.info(`Checking for ${app.name} news...`);

      const news = await Steam.getNewsFeed(app.value);

      for (const entry of news.entries) {
        const key = ['news', app.value, entry.id];

        const insert = await db.atomic()
          .check({ key, versionstamp: null })
          .mutate({
            type: 'set',
            key,
            value: entry,
          })
          .commit();

        if (insert.ok) {
          log.info('Inserted entry', entry.id);

          if (!STEAM_NEWS_SEND) {
            continue;
          }

          log.info('Sending new update...');

          console.log(entry?.description?.value ?? '');

          const appName = app.name;
          const link = news.links.at(0);
          const newsLink = entry?.links?.at(0)?.href ?? '';

          const content = Steam.formatFeedEntryToMarkdown(entry, appName, link);

          const truncated = [];
          let charactersLeft = 1_900;
          for (const line of content.split('\n')) {
            charactersLeft -= line.length + 1;
            if (charactersLeft < 0) {
              truncated.push(
                newsLink ? `[Read more](<${newsLink}>)` : '_truncated_',
              );
              break;
            }
            truncated.push(line);
          }

          const webhook = await fetch(STEAM_NEWS_DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': Deno.env.get('USER_AGENT')!,
            },
            body: JSON.stringify({
              content: truncated.join('\n').slice(0, 2_000),
            }),
          });

          if (!webhook.ok) {
            throw new Error(
              'Unable to execute webhook: ' + await webhook.text(),
            );
          }

          log.info('Update sent');
        } else {
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
};

await checkForNews();

if (STEAM_NEWS_SEND) {
  setInterval(checkForNews, NEWS_UPDATE_INTERVAL);
  log.info(`Started check interval`);
}
