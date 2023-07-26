/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { ActivityTypes } from '../deps.ts';
import { events } from './mod.ts';
import { logger } from '../utils/logger.ts';
import { bot } from '../bot.ts';

const log = logger({ name: 'Event: Ready' });

events.ready = async (payload) => {
  log.info(`[Application: ${payload.applicationId}]`);

  await bot.gateway.editBotStatus({
    status: 'online',
    activities: [
      {
        name: 'portal2_linux',
        type: ActivityTypes.Game,
      },
    ],
  });
};
