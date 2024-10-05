/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { Temporal } from '@js-temporal/polyfill';
import { DOMParser, Element, Node } from 'deno_dom/deno-dom-wasm.ts';
import { Bot, CreateApplicationCommand, Guild } from '@discordeno/bot';
import { logger } from './logger.ts';
import { commands } from '../commands/mod.ts';
import { BotWithCache } from '../bot.ts';

const log = logger({ name: 'Helpers' });

/**
 * Update global commands.
 *
 * @param bot - The bot object.
 */
export async function updateCommands(bot: BotWithCache) {
  const globalCommands = commands
    .filter(({ scope }) => scope === 'Global' || scope === undefined)
    .map<CreateApplicationCommand>(({ name, description, type, options }) => ({
      name,
      description,
      type,
      options,
    }));

  if (!globalCommands.length) {
    return;
  }

  log.info(`Updating ${globalCommands.length} global commands`);

  await bot.helpers.upsertGlobalApplicationCommands(globalCommands)
    .catch(log.error);
}

/**
 * Update guild specific commands.
 *
 * @param bot - The bot object.
 * @param guild - The guild object.
 */
export async function updateGuildCommands(bot: Bot, guild: Guild) {
  const guildCommands = commands
    .filter(({ scope, guilds }) => scope === 'Guild' && (!guilds?.length || guilds.includes(guild.id)))
    .map<CreateApplicationCommand>(({ name, description, type, options }) => ({
      name,
      description,
      type,
      options,
    }));

  if (!guildCommands.length) {
    return;
  }

  log.info(`Updating ${guildCommands.length} commands for guild ${guild.id}`);

  await bot.helpers.upsertGuildApplicationCommands(guild.id, guildCommands)
    .catch(log.error);
}

/**
 * Get the guild by ID.
 *
 * @param bot - The bot object.
 * @param guildId - The ID of the guild.
 * @returns - Guild object.
 */
export async function getGuildFromId(
  bot: BotWithCache,
  guildId: bigint,
): Promise<Guild> {
  let returnValue: Guild = {} as Guild;

  if (guildId !== 0n) {
    const guild = bot.guilds.get(guildId);
    if (guild) {
      returnValue = guild;
    }

    await bot.helpers.getGuild(guildId).then((guild) => {
      if (guild) {
        bot.guilds.set(guildId, guild);
        returnValue = guild;
      }
    });
  }

  return returnValue;
}

/**
 * Escape the title of a link for rendering Discord's masked links.
 *
 * NOTE: Discord's masked links are a scuffed version of Markdown links.
 *       You cannot escape [ and ] which means you have to remove it.
 *
 * @param linkTitle - The link title to escape.
 * @returns
 */
export function escapeMaskedLink(linkTitle: string) {
  return ['[', ']'].reduce(
    (text, characterToRemove) => text.replaceAll(characterToRemove, ''),
    linkTitle,
  );
}

const specialMdCharacters = [
  '[',
  ']',
  '(',
  ')',
  '`',
  '*',
  '_',
  '~',
];

/**
 * Escapes text for rendering Markdown content.
 *
 * @param text - The text to escape.
 * @returns - Escaped text.
 */
export function escapeMarkdown(text: string) {
  return specialMdCharacters.reduce(
    (title, char) => title.replaceAll(char, `\\${char}`),
    text,
  );
}

/**
 * Format challenge mode time.
 *    e.g. 600 = 6.00
 *         6000 = 1:00.00
 *
 * @param time - Total centiseconds.
 * @returns - Time as string.
 */
export function formatCmTime(time: number) {
  const cs = time % 100;
  const secs = Math.floor(time / 100);
  const sec = secs % 60;
  const min = Math.floor(secs / 60);
  return (min > 0)
    ? `${min}:${((sec < 10) ? `0${sec}` : `${sec}`)}.${((cs < 10) ? `0${cs}` : `${cs}`)}`
    : `${sec}.${((cs < 10) ? `0${cs}` : `${cs}`)}`;
}

/**
 * Format leaderboard points.
 *    e.g. 1000 = 1,000
 *
 * @param points - Leaderboard points.
 * @params formatCharacter - Format character to use.
 * @returns - Formatted points.
 */
export function formatBoardPoints(points: number, formatCharacter = ',') {
  return points >= 1_000 ? `${Math.floor(points / 1_000)}${formatCharacter}${points % 1_000}` : points.toString();
}

/**
 * Get the duration between an old date and now.
 *
 * @param date - A date in the past.
 * @returns - Duration object.
 */
export function getDurationSince(date: string) {
  return Temporal.Now.plainDateISO()
    .since(Temporal.PlainDateTime.from(date));
}

/**
 * Parse an HTML document string into an HTMLDocument object.
 *
 * @param html - The HTML string.
 * @returns - HTMLDocument object.
 */
export function parseHtmlDocument(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Markdown options for conversion.
 */
export type HtmlToDiscordMarkdownOptions = {
  /**
   * Used to format src links of <img src="..."> elements.
   * For example, this can be used to filter out a specific link.
   */
  imageFormatter?: (src: string) => string;
};

/**
 * Converts a raw HTML string to a string which can be used for Markdown rendering.
 *
 * @param rawHtml - The raw HTML string.
 * @param options - Markdown options.
 * @returns - The converted Markdown string.
 */
export function htmlToDiscordMarkdown(
  rawHtml: string,
  options?: HtmlToDiscordMarkdownOptions,
) {
  const result: string[] = [];

  const imageFormatter = options?.imageFormatter;

  const parseNode = (node: Node, depth: number) => {
    const nodeName = node.nodeName.toLowerCase();

    switch (nodeName) {
      case 'li':
        result.push('*'.padStart(depth, ' ') + ' ');
        break;
      case 'b':
        result.push('**');
        break;
      case 'br':
        result.push('\n');
        break;
      case '#text':
        result.push(node.textContent);
        break;
      case 'ul':
        result.push('\n');
        break;
      case 'img':
        {
          const src = (node as Element).getAttribute('src') ?? '';
          result.push(
            `${imageFormatter ? imageFormatter(src) : src}`,
          );
        }
        break;
      case 'iframe':
        result.push(
          `${(node as Element).getAttribute('src') ?? ''}`,
        );
        break;
      case 'i':
        result.push('_');
        break;
      case 'a':
        result.push('[');
        break;
      case 'html':
      case 'head':
      case 'body':
      case 'div':
        break;
      default:
        result.push(`<${nodeName}>`);
        log.warn(`Unhandled node ${nodeName}`);
        break;
    }

    node.childNodes
      .forEach((child) => parseNode(child, depth + 1));

    switch (nodeName) {
      case 'b':
        result.push('**');
        break;
      case 'ul':
        result.push('\n');
        break;
      case 'i':
        result.push('_');
        break;
      case 'a':
        result.push(
          `](<${(node as Element).getAttribute('href') ?? ''}>)`,
        );
        break;
      default:
        break;
    }
  };

  const html = parseHtmlDocument(rawHtml)?.textContent;
  const doc = parseHtmlDocument(html ?? '');

  doc?.childNodes
    .forEach((node) => parseNode(node, -1));

  return result.join('');
}
