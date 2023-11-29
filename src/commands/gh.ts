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
import { Commit } from '../services/github_api.ts';

const customQuery: (name: string, query: string) => boolean = (name, query) =>
  name.startsWith(query) ||
  name.startsWith('[' + query) ||
  (name.startsWith('[SourceAutoRecord]') && query === 'sar') ||
  (name.startsWith('[portal2-mtriggers]') && query === 'mtriggers') ||
  (name.startsWith('[Portal2SpeedrunMod]') && query === 'srm') ||
  name.split(' ').some((part) => part.toLowerCase().startsWith(query));

export const findIssue = createAutocompletion({
  items: () => GitHub.Issues.List,
  idKey: 'node_id',
  nameKey: 'search',
  customQuery,
});
export const findPullRequest = createAutocompletion({
  items: () => GitHub.Pulls.List,
  idKey: 'node_id',
  nameKey: 'search',
  customQuery,
});
export const findRelease = createAutocompletion({
  items: () => GitHub.Releases.List,
  idKey: 'node_id',
  nameKey: 'search',
  customQuery,
});
export const findBranch = createAutocompletion({
  items: () => GitHub.Branches.List,
  idKey: 'id',
  nameKey: 'search',
  customQuery,
});

const limitMessage = (lines: string[], limit = 2_000) => {
  limit -= 3;
  const message: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length > limit) {
      break;
    }
    message.push(line);
    length += line.length + 1;
  }
  return message.join('\n') + (lines.length !== message.length ? '...' : '');
};

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
        const query = getArg('query').toLowerCase();
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
                        name: issue.search,
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
                        name: pr.search,
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
                        name: release.search,
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
                        name: branch.search,
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
                  embeds: [
                    {
                      title: `${result.repository} - Issue #${result.number}`,
                      url: result.html_url,
                      color: 3447003,
                      author: {
                        name: result.user.login,
                        url: result.user.html_url,
                        iconUrl: result.user.avatar_url,
                      },
                      description: limitMessage([
                        '### ' + result.title,
                        result.body,
                      ]),
                    },
                  ],
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

            const footer = `\n\`\`\`\ngh pr checkout ${result.number}\n\`\`\``;

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  embeds: [
                    {
                      title: `${result.repository} - Pull Request #${result.number}`,
                      url: result.html_url,
                      color: 3447003,
                      author: {
                        name: result.user.login,
                        url: result.user.html_url,
                        iconUrl: result.user.avatar_url,
                      },
                      description: limitMessage([
                        '### ' + result.title,
                        result.body,
                      ], 2_000 - footer.length) + footer,
                    },
                  ],
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
                  embeds: [
                    {
                      title: `${result.repository} - ${result.name}`,
                      url: result.html_url,
                      color: 3447003,
                      author: {
                        name: result.author.login,
                        url: result.author.html_url,
                        iconUrl: result.author.avatar_url,
                      },
                      description: result.body.slice(0, 2_000),
                    },
                  ],
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

            const headers = GitHub.getHeaders();
            const res = await fetch(result.commit.url, { headers });
            if (!res.ok) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Failed to fetch commit: (${res.statusText})`,
                    flags: MessageFlags.Ephemeral,
                  },
                },
              );
              return;
            }

            const commit = await res.json() as Commit;
            const messageLines = commit.commit.message.split('\n');

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  embeds: [
                    {
                      title: `${result.repository} - ${result.name}`,
                      url: result.html_url,
                      color: 3447003,
                      author: {
                        name: commit.author?.login ?? commit.commit.author.name,
                        url: commit.author?.html_url,
                        iconUrl: commit.author?.avatar_url,
                      },
                      description: limitMessage([
                        '### ' + messageLines.at(0),
                        ...messageLines.slice(1),
                      ]),
                    },
                  ],
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
