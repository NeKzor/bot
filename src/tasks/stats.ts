/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { Board } from '../services/board.ts';
import { escapeMarkdown, formatCmTime } from '../utils/helpers.ts';
import { log } from '../utils/logger.ts';

export const sendWeeklyStats = (webhookUrl: string) => async () => {
  try {
    log.info('Sending weekly stats...');

    const now = Temporal.Now.plainDateTimeISO();

    const changelog = await Board.getChangelog({
      startDate: now.add({ days: -7 }).toPlainDate().toString(),
      endDate: now.toPlainDate().toString(),
    });

    // Convert changelog entry to a more useful object
    const toEntry = (entry: (typeof changelog)['0']) => ({
      user: {
        id: entry.profile_number,
        name: entry.player_name,
        avatar: entry.avatar,
      },
      chamber: {
        id: entry.mapid,
        name: entry.chamberName,
      },
      id: entry.id,
      date: entry.time_gained,
      score: parseInt(entry.score, 10),
      prDelta: entry.previous_score ? Math.abs(parseInt(entry.score, 10) - parseInt(entry.previous_score, 10)) : null,
      wrDelta: 0, // FIXME: I wish we had that information
      rank: parseInt(entry.post_rank),
      isBanned: entry.banned === '1',
      isPending: entry.pending === '1',
      hasDemo: entry.hasDemo === '1',
      media: entry.youtubeID,
    });

    const entries = changelog
      .map(toEntry)
      .filter(({ isBanned, isPending }) => !isBanned && !isPending);

    const maxEntries = 5;

    const createUserStat = (byStat?: (entry: ReturnType<typeof toEntry>) => boolean) => {
      const filtered = byStat ? entries.filter(byStat) : entries;
      const users = filtered.map((entry) => entry.user);

      const frequency = users.reduce((count, id) => {
        count[id.id] = (count[id.id] || 0) + 1;
        return count;
      }, {} as Record<string, number>);

      return Object.keys(frequency)
        .sort((a, b) => frequency[b]! - frequency[a]!)
        .map((id) => ({
          user: users.find((user) => user.id === id)!,
          count: frequency[id],
        }))
        .slice(0, maxEntries);
    };

    const createChamberStat = (byStat?: (entry: ReturnType<typeof toEntry>) => boolean) => {
      const filtered = byStat ? entries.filter(byStat) : entries;
      const chambers = filtered.map((entry) => entry.chamber);

      const frequency = chambers.reduce((count, id) => {
        count[id.id] = (count[id.id] || 0) + 1;
        return count;
      }, {} as Record<string, number>);

      return Object.keys(frequency)
        .sort((a, b) => frequency[b]! - frequency[a]!)
        .map((id) => ({
          chamber: chambers.find((user) => user.id === id)!,
          count: frequency[id],
        }))
        .slice(0, maxEntries);
    };

    const mostPersonalRecords = createUserStat();
    const mostDemoUploads = createUserStat(({ hasDemo }) => hasDemo);
    const mostWorldRecords = createUserStat(({ rank }) => rank === 1);
    const mostYouTubeLinks = createUserStat(({ media }) => media !== null);
    const mostActiveMaps = createChamberStat();

    // For now we use PR delta instead of WR delta...
    const largestImprovements = entries
      .filter((entry) => entry.prDelta !== null)
      .sort((a, b) => b.prDelta! - a.prDelta!)
      .slice(0, maxEntries);

    const fieldValue = (value: string) => (value ? value : 'n/a');

    const webhook = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': Deno.env.get('USER_AGENT')!,
      },
      body: JSON.stringify({
        embeds: [
          {
            title: `Recap - Week #${now.weekOfYear}`,
            url: 'https://board.portal2.sr',
            color: 295077,
            fields: [
              {
                name: 'Most World Records',
                value: fieldValue(
                  mostWorldRecords
                    .map(({ user, count }) => `${escapeMarkdown(user.name)} - ${count}`)
                    .join('\n'),
                ),
                inline: true,
              },
              {
                name: 'Top Demo Uploaders',
                value: fieldValue(
                  mostDemoUploads
                    .map(({ user, count }) => `${escapeMarkdown(user.name)} - ${count}`)
                    .join('\n'),
                ),
                inline: true,
              },
              {
                name: 'Top Personal Timesaves',
                value: fieldValue(
                  largestImprovements
                    .map(({ prDelta, chamber, user }) =>
                      `-${formatCmTime(prDelta!)} on ${chamber.name} by ${escapeMarkdown(user.name)}`
                    )
                    .join('\n'),
                ),
                inline: true,
              },
              {
                name: 'Most Personal Records',
                value: fieldValue(
                  mostPersonalRecords
                    .map(({ user, count }) => `${escapeMarkdown(user.name)} - ${count}`)
                    .join('\n'),
                ),
                inline: true,
              },
              {
                name: 'Top Video Uploaders',
                value: fieldValue(
                  mostYouTubeLinks
                    .map(({ user, count }) => `${escapeMarkdown(user.name)} - ${count}`)
                    .join('\n'),
                ),
                inline: true,
              },
              {
                name: 'Most Records By Map',
                value: fieldValue(mostActiveMaps.map(({ chamber, count }) => `${chamber.name} - ${count}`).join('\n')),
                inline: true,
              },
            ],
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
  } catch (err) {
    log.error(err);
  }
};
