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
  MessageComponentTypes,
  SelectOption,
  TextStyles,
} from "../deps.ts";
import { GitHub } from "../services/github.ts";
import { RateLimit } from "../services/ratelimit.ts";
import { escapeMaskedLink } from "../utils/helpers.ts";
import { log } from "../utils/logger.ts";
import { createCommand } from "./mod.ts";

const repositories: SelectOption[] = [
  {
    label: "bot",
    value: "NeKzBot/bot",
    description: "The bot project!",
  },
  {
    label: "autorender",
    value: "NeKzor/autorender",
    description: "The autorender project!",
  },
  // {
  //     label: "sar",
  //     value: "p2sr/SourceAutoRecord",
  //     description: "The SourceAutoRecord project!",
  // },
];

createCommand({
  name: "report",
  description: "Report a bug.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Guild",
  options: [
    {
      name: "bug",
      description: "Report a bug!",
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: "project",
          description: "The project in which the bug occurred.",
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
          case "bug": {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type:
                  InteractionResponseTypes.ApplicationCommandAutocompleteResult,
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
        const [_command, subCommand, repository] =
          interaction.data?.customId?.split("_", 3) ?? [];

        switch (subCommand) {
          case "bug": {
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

              const title = modal?.at(0)?.components?.at(0)?.value;
              const body = modal?.at(1)?.components?.at(0)?.value;

              if (
                !repositories.find((repo) => repo.value === repository) ||
                !title ||
                !body
              ) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: `❌️ Invalid project, title or description.`,
                  },
                );
                return;
              }

              if (
                !await RateLimit.checkUser("reportBug", interaction.user.id)
              ) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content:
                      `❌️ Too many requests. You are being rate limited.`,
                  },
                );
                return;
              }

              const [owner, repo] = repository.split("/");

              const issue = await GitHub.createIssue({
                owner,
                repo,
                issue: {
                  title,
                  body: [
                    body.replaceAll(/@([a-zA-Z0-9\-]+)/g, "@ $1"),
                    "---",
                    `> Reported by Discord user ${interaction.user.username}`,
                  ].join("\n"),
                },
                token: Deno.env.get("GITHUB_ACCESS_TOKEN")!,
              });

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `🪲️ Reported new bug: [${
                    escapeMaskedLink(`${repo}#${issue.number}`)
                  }](${issue.html_url})`,
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
          case "bug": {
            const project = args
              .find((arg) => arg.name === "project")?.value;

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
                    flags: 1 << 6,
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
                    .join("_"),
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
                          customId: "title",
                          label: "Title",
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
                          customId: "body",
                          label: "Describe your issue:",
                          placeholder: "Please enter a detailed description.",
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
