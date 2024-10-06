/*
 * Copyright (c) 2023-2024, NeKz
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
  MessageComponentTypes,
  MessageFlags,
  SelectOption,
  TextStyles,
} from '@discordeno/bot';
import { GitHub } from '../services/github.ts';
import { RateLimit } from '../services/ratelimit.ts';
import { escapeMaskedLink } from '../utils/helpers.ts';
import { log } from '../utils/logger.ts';
import { createCommand } from './mod.ts';

const repositories: SelectOption[] = [
  {
    label: 'autorender',
    value: 'NeKzor/autorender',
    description: 'The autorender project! (autorender.portal2.sr)',
  },
  {
    label: 'board',
    value: 'p2sr/Portal2Boards',
    description: 'The Challenge Mode leaderboard project! (board.portal2.sr)',
  },
  {
    label: 'board-cmm',
    value: 'NeKzor/board',
    description: 'The leaderboard project for Challenge Mode Mod!',
  },
  {
    label: 'bot',
    value: 'NeKzor/bot',
    description: 'The bot project!',
  },
  {
    label: 'cmm',
    value: 'NeKzor/cmm',
    description: 'The Challenge Mode Mod project!',
  },
  {
    label: 'sar',
    value: 'p2sr/SourceAutoRecord',
    description: 'The SourceAutoRecord project!',
  },
  {
    label: 'sar-autos-splitter',
    value: 'p2sr/sar-autos-splitter',
    description: 'The AutoSplitter project!',
  },
  {
    label: 'speedrunmod',
    value: 'p2sr/Portal2SpeedrunMod',
    description: 'The Portal 2 Speedrun Mod project!',
  },
  {
    label: 'srconfigs',
    value: 'p2sr/srconfigs',
    description: 'The srconfigs project!',
  },
  // {
  //   label: 'bot-test',
  //   value: 'p2sr/bot-test',
  //   description: 'Testing the command!',
  // },
];

createCommand({
  name: 'report',
  description: 'Report a bug.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Guild',
  options: [
    {
      name: 'bug',
      description: 'Report a bug!',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'project',
          description: 'The project in which the bug occurred.',
          type: ApplicationCommandOptionTypes.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const subCommand = [...(interaction.data?.options?.values() ?? [])]
          .at(0)!;

        switch (subCommand.name) {
          case 'bug': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
                data: {
                  choices: repositories.map((repo) => {
                    return {
                      name: repo.label,
                      value: repo.value,
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
      case InteractionTypes.ModalSubmit: {
        const [_command, subCommand, repository] = interaction.data?.customId?.split('_', 3) ?? [];

        switch (subCommand) {
          case 'bug': {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `🪲️ Reporting new bug...`,
                },
              },
            );

            try {
              const modal = interaction.data?.components;

              const selected = repositories.find((repo) => repo.value === repository);
              const title = modal?.at(0)?.components?.at(0)?.value;
              const body = modal?.at(1)?.components?.at(0)?.value;

              if (!selected || !title || !body) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: `❌️ Invalid project, title or description.`,
                  },
                );
                return;
              }

              if (
                !await RateLimit.checkUser('reportBug', interaction.user.id)
              ) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: `❌️ Too many requests. You are being rate limited.`,
                  },
                );
                return;
              }

              const [owner, repo] = selected.value.split('/') as [string, string];

              const issueData = {
                owner,
                repo,
                issue: {
                  title,
                  body: [
                    body.replaceAll(/@([a-zA-Z0-9\-]+)/g, '@ $1'),
                    '---',
                    `> Reported by Discord user ${interaction.user.username}`,
                  ].join('\n'),
                },
              };

              const issue = await GitHub.createIssue(issueData);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `🪲️ Reported new bug: [${escapeMaskedLink(`${repo}#${issue.number}`)}](${issue.html_url})`,
                },
              );
            } catch (err) {
              log.error(err);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `❌️ Failed to send bug report.`,
                },
              );
            }
            break;
          }
          default:
            break;
        }
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const subCommand = [...(interaction.data?.options?.values() ?? [])].at(
          0,
        )!;
        const args = [...(subCommand.options?.values() ?? [])];

        switch (subCommand.name) {
          case 'bug': {
            const project = args
              .find((arg) => arg.name === 'project')?.value;

            if (
              !repositories.find((repository) => repository.value === project)
            ) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Invalid project.`,
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
                type: InteractionResponseTypes.Modal,
                data: {
                  title: `Report bug to github.com/${project}`,
                  customId: [interaction.data?.name, subCommand.name, project]
                    .join('_'),
                  components: [
                    // TODO: Use generic select menu whenever Discord adds support for it.
                    // {
                    //   type: MessageComponentTypes.ActionRow,
                    //   components: [
                    //     {
                    //       type: MessageComponentTypes.SelectMenu,
                    //       customId: "repository",
                    //       options: repositories,
                    //     },
                    //   ],
                    // },
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.InputText,
                          style: TextStyles.Short,
                          customId: 'title',
                          label: 'Title',
                          maxLength: 32,
                          required: true,
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.InputText,
                          style: TextStyles.Paragraph,
                          customId: 'body',
                          label: 'Describe your issue:',
                          placeholder: 'Please enter a detailed description.',
                          minLength: 12,
                          maxLength: 512,
                          required: true,
                        },
                      ],
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
