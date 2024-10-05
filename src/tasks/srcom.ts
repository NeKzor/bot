/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { db } from '../services/db.ts';
import { log } from '../utils/logger.ts';

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

let ignoreFirstUpdate = (await Array.fromAsync(db.list({ prefix: ['srcom'] }))).length === 0;

export const checkForNotifications = (webhookUrl: string) => async () => {
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

        if (ignoreFirstUpdate) {
          continue;
        }

        const webhook = await fetch(webhookUrl, {
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

    ignoreFirstUpdate = false;
  } catch (err) {
    log.error(err);
  }
};
