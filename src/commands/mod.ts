/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  type ApplicationCommandOption,
  type ApplicationCommandTypes,
  type Bot,
  Collection,
  type Interaction,
} from '@discordeno/bot';

export type subCommand = Omit<Command, 'subcommands'>;
export interface subCommandGroup {
  name: string;
  subCommands: subCommand[];
}
export interface Command {
  name: string;
  description: string;
  usage?: string[];
  options?: ApplicationCommandOption[];
  type: ApplicationCommandTypes;
  /** Defaults to `Guild` */
  scope?: 'Global' | 'Guild';
  guilds?: bigint[];
  execute: (bot: Bot, interaction: Interaction) => unknown;
  subcommands?: (subCommandGroup | subCommand)[];
}

export const commands = new Collection<string, Command>();

export function createCommand(command: Command) {
  commands.set(command.name, command);
}
