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
import { escapeMaskedLink } from "../utils/helpers.ts";
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
            const title = interaction.data?.components?.at(0)?.components?.at(0)
              ?.value;
            const body = interaction.data?.components?.at(1)?.components?.at(0)
              ?.value;

            console.log({ repository, title, body });

            if (
              !repositories.find((repo) => repo.value === repository) ||
              !title ||
              !body
            ) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Failed to send bug report.`,
                  },
                },
              );
              return;
            }

            try {
              const [owner, repo] = repository.split("/");

              const issue = await GitHub.createIssue({
                owner,
                repo,
                issue: {
                  title,
                  body: [
                    body,
                    "---",
                    `> Reported by Discord user ${interaction.user.username}`,
                  ].join("\n"),
                },
                token: Deno.env.get("GITHUB_ACCESS_TOKEN")!,
              });

              //const issue = { number: 1, html_url: "https://github.com/NeKzor/bot/issues/1" };

              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `🪲️ Reported new bug: [${
                      escapeMaskedLink(`${repo}#${issue.number}`)
                    }](${issue.html_url})`,
                  },
                },
              );
            } catch (err) {
              console.error(err);

              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Failed to send bug report.`,
                  },
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
