/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'dotenv/load.ts';

import { log } from '../src/utils/logger.ts';

const SRCOM_UPDATE_INTERVAL = 5 * 60 * 1_000;

const SRCOM_DISCORD_WEBHOOK_URL = Deno.env.get(
  'SRCOM_DISCORD_WEBHOOK_URL',
)!;
const SRCOM_SEND = Deno.env.get('SRCOM_SEND') === 'true';

if (!SRCOM_DISCORD_WEBHOOK_URL) {
  log.error('Environment variable SRCOM_DISCORD_WEBHOOK_URL not set!');
  Deno.exit(1);
}

if (!SRCOM_SEND) {
  log.warn('Running check without sending messages.');
  log.warn(
    'Turn on environment variable SRCOM_SEND once the data is populated in the database.',
  );
}

interface GetNotificationsResponse {
  unreadCount: number;
  notifications: {
    id: string;
    date: number;
    title: string;
    path: string;
    read: boolean;
  }[];
}

const db = await Deno.openKv();

const checkForNotifications = async () => {
  try {
    log.info(`Checking for notifications...`);

    const res = await fetch('https://www.speedrun.com/api/v2/GetNotifications', {
      method: 'POST',
      headers: {
        // FIXME: Auto-refresh session or use v1 again?
        Cookie: 'PHPSESSID=' + Deno.env.get('SRCOM_PHPSESSID')!,
        'Content-Type': 'application/json',
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
      body: JSON.stringify({
        limit: 10,
      }),
    });

    if (!res.ok) {
      throw new Error(`GetNotifications failed: ` + res.status);
    }

    const { notifications } = await res.json() as GetNotificationsResponse;

    for (const notification of notifications) {
      const key = ['srcom', notification.id];

      const insert = await db.atomic()
        .check({ key, versionstamp: null })
        .mutate({
          type: 'set',
          key,
          value: notification,
        })
        .commit();

      if (insert.ok) {
        log.info('Inserted notification', notification);

        const webhook = await fetch(SRCOM_DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': Deno.env.get('USER_AGENT')!,
          },
          body: JSON.stringify({
            embeds: [
              {
                title: notification.title,
                url: 'https://speedrun.com' + notification.path,
                color: 0xffd95c,
              },
            ],
          }),
        });

        if (!webhook.ok) {
          throw new Error(
            'Unable to execute webhook: ' + await webhook.text(),
          );
        }

        log.info('Update sent');
      }
    }
  } catch (err) {
    log.error(err);
  }
};

await checkForNotifications();

if (SRCOM_SEND) {
  setInterval(checkForNotifications, SRCOM_UPDATE_INTERVAL);
  log.info(`Started check interval`);
}
