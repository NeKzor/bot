/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { Temporal } from "npm:@js-temporal/polyfill";
import {
  DOMParser,
  Element,
  Node,
} from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import {
  Bot,
  BotWithCache,
  CreateApplicationCommand,
  Guild,
  MakeRequired,
} from "../deps.ts";
import {
  getGuild,
  hasProperty,
  upsertGuildApplicationCommands,
} from "../deps.ts";
import { logger } from "./logger.ts";
import type { subCommand, subCommandGroup } from "../commands/mod.ts";
import { commands } from "../commands/mod.ts";

const log = logger({ name: "Helpers" });

/** This function will update all commands, or the defined scope */
export async function updateCommands(
  bot: BotWithCache,
  scope?: "Guild" | "Global",
) {
  const globalCommands: Array<MakeRequired<CreateApplicationCommand, "name">> =
    [];
  const perGuildCommands: Array<
    MakeRequired<CreateApplicationCommand, "name">
  > = [];

  for (const command of commands.values()) {
    if (command.scope) {
      if (command.scope === "Guild") {
        perGuildCommands.push({
          name: command.name,
          description: command.description,
          type: command.type,
          options: command.options ? command.options : undefined,
        });
      } else if (command.scope === "Global") {
        globalCommands.push({
          name: command.name,
          description: command.description,
          type: command.type,
          options: command.options ? command.options : undefined,
        });
      }
    } else {
      perGuildCommands.push({
        name: command.name,
        description: command.description,
        type: command.type,
        options: command.options ? command.options : undefined,
      });
    }
  }

  if (globalCommands.length && (scope === "Global" || scope === undefined)) {
    log.info("Updating Global Commands, changes should apply in short...");
    await bot.helpers.upsertGlobalApplicationCommands(globalCommands).catch(
      log.error,
    );
  }

  if (perGuildCommands.length && (scope === "Guild" || scope === undefined)) {
    await bot.guilds.forEach(async (guild: Guild) => {
      await upsertGuildApplicationCommands(bot, guild.id, perGuildCommands);
    });
  }
}

/** Update commands for a guild */
export async function updateGuildCommands(bot: Bot, guild: Guild) {
  const perGuildCommands: Array<
    MakeRequired<CreateApplicationCommand, "name">
  > = [];

  for (const command of commands.values()) {
    if (command.scope) {
      if (command.scope === "Guild") {
        perGuildCommands.push({
          name: command.name,
          description: command.description,
          type: command.type,
          options: command.options ? command.options : undefined,
        });
      }
    }
  }

  if (perGuildCommands.length) {
    await upsertGuildApplicationCommands(bot, guild.id, perGuildCommands);
  }
}

export async function getGuildFromId(
  bot: BotWithCache,
  guildId: bigint,
): Promise<Guild> {
  let returnValue: Guild = {} as Guild;

  if (guildId !== 0n) {
    if (bot.guilds.get(guildId)) {
      returnValue = bot.guilds.get(guildId) as Guild;
    }

    await getGuild(bot, guildId).then((guild) => {
      if (guild) bot.guilds.set(guildId, guild);
      if (guild) returnValue = guild;
    });
  }

  return returnValue;
}

export function snowflakeToTimestamp(id: bigint) {
  return Number(id / 4194304n + 1420070400000n);
}

export function humanizeMilliseconds(milliseconds: number) {
  // Gets ms into seconds
  const time = milliseconds / 1000;
  if (time < 1) return "1s";

  const days = Math.floor(time / 86400);
  const hours = Math.floor((time % 86400) / 3600);
  const minutes = Math.floor(((time % 86400) % 3600) / 60);
  const seconds = Math.floor(((time % 86400) % 3600) % 60);

  const dayString = days ? `${days}d ` : "";
  const hourString = hours ? `${hours}h ` : "";
  const minuteString = minutes ? `${minutes}m ` : "";
  const secondString = seconds ? `${seconds}s ` : "";

  return `${dayString}${hourString}${minuteString}${secondString}`;
}

export function isSubCommand(
  data: subCommand | subCommandGroup,
): data is subCommand {
  return !hasProperty(data, "subCommands");
}

export function isSubCommandGroup(
  data: subCommand | subCommandGroup,
): data is subCommandGroup {
  return hasProperty(data, "subCommands");
}

// NOTE: Discord's masked links are a scuffed version of Markdown links.
//       You cannot escape [ and ] which means you have to remove it.
export function escapeMaskedLink(link: string) {
  return ["[", "]"].reduce(
    (text, characterToRemove) => text.replaceAll(characterToRemove, ""),
    link,
  );
}

const specialMdCharacters = [
  "[",
  "]",
  "(",
  ")",
  "`",
  "*",
  "_",
  "~",
];

export function escapeMarkdown(text: string) {
  return specialMdCharacters.reduce(
    (title, char) => title.replaceAll(char, `\\${char}`),
    text,
  );
}

/**
 * Format challenge mode time
 *    e.g. 600 = 6.00
 *         6000 = 1:00.00
 * @param time - Total centiseconds
 * @returns - Time as string
 */
export function formatCmTime(time: number) {
  const cs = time % 100;
  const secs = Math.floor(time / 100);
  const sec = secs % 60;
  const min = Math.floor(secs / 60);
  return (min > 0)
    ? `${min}:${((sec < 10) ? `0${sec}` : `${sec}`)}.${((cs < 10)
      ? `0${cs}`
      : `${cs}`)}`
    : `${sec}.${((cs < 10) ? `0${cs}` : `${cs}`)}`;
}

/**
 * Format leaderboard points
 *    e.g. 1000 = 1,000
 * @param points - Leaderboard points
 * @params formatCharacter - Format character to use
 * @returns - Formatted points
 */
export function formatBoardPoints(points: number, formatCharacter = ",") {
  return points >= 1_000
    ? `${Math.floor(points / 1_000)}${formatCharacter}${points % 1_000}`
    : points.toString();
}

export function getDurationSince(date: string) {
  return Temporal.Now.plainDateISO()
    .since(Temporal.PlainDateTime.from(date));
}

export function parseHtmlDocument(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

export type HtmlToDiscordMarkdownOptions = {
  imageFormatter?: (src: string) => string;
};

export function htmlToDiscordMarkdown(
  rawHtml: string,
  options?: HtmlToDiscordMarkdownOptions,
) {
  const result: string[] = [];

  const imageFormatter = options?.imageFormatter;

  const parseNode = (node: Node, depth: number) => {
    const nodeName = node.nodeName.toLowerCase();

    switch (nodeName) {
      case "li":
        result.push("*".padStart(depth, " ") + " ");
        break;
      case "b":
        result.push("**");
        break;
      case "br":
        result.push("\n");
        break;
      case "#text":
        result.push(node.textContent);
        break;
      case "ul":
        result.push("\n");
        break;
      case "img":
        {
          const src = (node as Element).getAttribute("src") ?? "";
          result.push(
            `${imageFormatter ? imageFormatter(src) : src}`,
          );
        }
        break;
      case "iframe":
        result.push(
          `${(node as Element).getAttribute("src") ?? ""}`,
        );
        break;
      case "i":
        result.push("_");
        break;
      case "a":
        result.push("[");
        break;
      case "html":
      case "head":
      case "body":
      case "div":
        break;
      default:
        result.push(`<${nodeName}>`);
        log.warn(`Unhandled node ${nodeName}`);
        break;
    }

    node.childNodes
      .forEach((child) => parseNode(child, depth + 1));

    switch (nodeName) {
      case "b":
        result.push("**");
        break;
      case "ul":
        result.push("\n");
        break;
      case "i":
        result.push("_");
        break;
      case "a":
        result.push(
          `](<${(node as Element).getAttribute("href") ?? ""}>)`,
        );
        break;
      default:
        break;
    }
  };

  const html = parseHtmlDocument(rawHtml)?.textContent;
  const doc = parseHtmlDocument(html ?? "");

  doc?.childNodes
    .forEach((node) => parseNode(node, -1));

  return result.join("");
}
