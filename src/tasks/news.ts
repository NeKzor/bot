/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { db } from '../services/db.ts';
import { Portal2Apps, Steam } from '../services/steam.ts';
import { log } from '../utils/logger.ts';

const apps = Portal2Apps.filter((app) => app.name === 'Portal 2');

const appWithoutNews = new Set<string>();

for (const app of apps) {
  const news = await Array.fromAsync(db.list({ prefix: ['news', app.value] }));
  if (news.length === 0) {
    appWithoutNews.add(app.value);
  }
}

export const checkForNews = (webhookUrl: string) => async () => {
  for (const app of apps) {
    try {
      log.info(`Checking for ${app.name} news...`);

      const skipFirstUpdate = appWithoutNews.has(app.value);

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

          if (skipFirstUpdate) {
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

          const webhook = await fetch(webhookUrl, {
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

      appWithoutNews.delete(app.value);
    } catch (err) {
      console.error(err);
    }
  }
};
