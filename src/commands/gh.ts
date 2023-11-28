/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import {
  ApplicationCommandOptionChoice,
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  Bot,
  Interaction,
  InteractionResponseTypes,
  InteractionTypes,
  MessageFlags,
} from '@discordeno/bot';
import { createCommand } from './mod.ts';
import { createAutocompletion } from '../utils/autocompletion.ts';
import { GitHub } from '../services/github.ts';

export const findIssue = createAutocompletion({
  items: () => GitHub.Issues.List,
  idKey: 'node_id',
  nameKey: 'title',
});
export const findPullRequest = createAutocompletion({
  items: () => GitHub.Pulls.List,
  idKey: 'node_id',
  nameKey: 'title',
});
export const findRelease = createAutocompletion({
  items: () => GitHub.Releases.List,
  idKey: 'node_id',
  nameKey: 'name',
});
export const findBranch = createAutocompletion({
  items: () => GitHub.Branches.List,
  idKey: 'id',
  nameKey: 'name',
});

await GitHub.loadAll();

createCommand({
  name: 'gh',
  description: 'GitHub related commands.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'issue',
      description: 'Find an issue.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'query',
          description: 'Search query.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
    },
    {
      name: 'pr',
      description: 'Find a pull request.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'query',
          description: 'Search query.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
    },
    {
      name: 'release',
      description: 'Find a release.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'query',
          description: 'Search query.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
    },
    {
      name: 'branch',
      description: 'Find a branch.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'query',
          description: 'Search query.',
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const subCommand = [...(interaction.data?.options?.values() ?? [])]
      .at(0)!;
    const args = [...(subCommand.options?.values() ?? [])];
    const getArg = (name: string) => {
      return args
        .find((arg) => arg.name === name)?.value?.toString()?.trim() ?? '';
    };

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = getArg('query');
        switch (subCommand.name) {
          case 'issue': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: findIssue({ query, isAutocomplete: true })
                    .map((issue) => {
                      return {
                        name: issue.title,
                        value: issue.node_id,
                      } as ApplicationCommandOptionChoice;
                    }),
                },
              },
            );
            break;
          }
          case 'pr': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: findPullRequest({ query, isAutocomplete: true })
                    .map((pr) => {
                      return {
                        name: pr.title,
                        value: pr.node_id,
                      } as ApplicationCommandOptionChoice;
                    }),
                },
              },
            );
            break;
          }
          case 'release': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: findRelease({ query, isAutocomplete: true })
                    .map((release) => {
                      return {
                        name: release.name,
                        value: release.node_id,
                      } as ApplicationCommandOptionChoice;
                    }),
                },
              },
            );
            break;
          }
          case 'branch': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: findBranch({ query, isAutocomplete: true })
                    .map((branch) => {
                      return {
                        name: branch.name,
                        value: branch.id,
                      } as ApplicationCommandOptionChoice;
                    }),
                },
              },
            );
            break;
          }
          default:
            break;
        }
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const query = getArg('query');
        switch (subCommand.name) {
          case 'issue': {
            const results = findIssue({ query, isAutocomplete: false });
            const result = results.at(0);

            if (!result) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Issue not found.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            if (results.length > 1) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: result.html_url,
                },
              },
            );
            break;
          }
          case 'pr': {
            const results = findPullRequest({ query, isAutocomplete: false });
            const result = results.at(0);

            if (!result) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Pull request not found.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            if (results.length > 1) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: result.html_url,
                },
              },
            );
            break;
          }
          case 'release': {
            const results = findRelease({ query, isAutocomplete: false });
            const result = results.at(0);

            if (!result) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Release not found.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            if (results.length > 1) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: result.html_url,
                },
              },
            );
            break;
          }
          case 'branch': {
            const results = findBranch({ query, isAutocomplete: false });
            const result = results.at(0);

            if (!result) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Branch not found.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            if (results.length > 1) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: result.html_url,
                },
              },
            );
            break;
          }
          default:
            break;
        }
        break;
      }
      default:
        break;
    }
  },
});
