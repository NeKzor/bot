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
} from '../deps.ts';
import { Exploit, Exploits } from '../services/exploits.ts';
import { escapeMaskedLink } from '../utils/helpers.ts';
import { log } from '../utils/logger.ts';
import { findExploit } from './glitch.ts';
import { createCommand } from './mod.ts';

createCommand({
  name: 'update',
  description: 'Update specific bot data.',
  type: ApplicationCommandTypes.ChatInput,
  scope: 'Global',
  options: [
    {
      name: 'glitch',
      description: 'Update or add a glitch.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'name',
          description: 'Name of the glitch.',
          type: ApplicationCommandOptionTypes.String,
          required: true,
          autocomplete: true,
        },
        {
          name: 'aliases',
          description: 'Aliases of the glitch separated by the `,` character.',
          type: ApplicationCommandOptionTypes.String,
        },
        // {
        //   name: "type",
        //   description: "Type of the glitch.",
        //   type: ApplicationCommandOptionTypes.String,
        // },
        // {
        //   name: "category",
        //   description: "Category of the glitch.",
        //   type: ApplicationCommandOptionTypes.String,
        // },
        // {
        //   name: "status",
        //   description: "Status of the glitch.",
        //   type: ApplicationCommandOptionTypes.String,
        // },
        {
          name: 'video',
          description: 'Showcase video of the glitch.',
          type: ApplicationCommandOptionTypes.String,
        },
        {
          name: 'wiki_link',
          description: 'Wiki link of the glitch.',
          type: ApplicationCommandOptionTypes.String,
        },
        {
          name: 'description',
          description: 'Description of the glitch.',
          type: ApplicationCommandOptionTypes.String,
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
        const query = args.find((arg) => arg.name === 'name')?.value?.toString()?.toLowerCase() ?? '';

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
            data: {
              choices: findExploit({ query, isAutocomplete: true })
                .map((exploit) => {
                  return {
                    name: exploit.name,
                    value: exploit.name,
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        switch (subCommand.name) {
          case 'glitch': {
            // TODO: Permissions
            const hasPermission = [BigInt('84272932246810624')].includes(
              interaction.user.id,
            );

            if (!hasPermission) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ You do not have the permissions to use this command.`,
                    flags: 1 << 6,
                  },
                },
              );
              return;
            }

            const name = getArg('name');
            if (!name.length) {
              await bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                  type: InteractionResponseTypes.ChannelMessageWithSource,
                  data: {
                    content: `❌️ Invalid glitch name.`,
                    flags: 1 << 6,
                  },
                },
              );
              return;
            }

            const aliases = getArg('aliases');
            const type = getArg('type');
            const category = getArg('category');
            const status = getArg('status');
            const showcase = getArg('video');
            const wiki = getArg('wiki_link');
            const overview = getArg('description');

            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `Updating glitch...`,
                  flags: 1 << 6,
                },
              },
            );

            try {
              let exploit = await Exploits.find(name);
              const isUpdate = !!exploit;

              if (exploit) {
                const update: Exploit = {
                  name,
                  aliases: aliases !== ''
                    ? aliases
                      .split(',')
                      .map((alias) => alias.trim())
                      .filter((alias) => alias)
                    : [],
                  type,
                  category,
                  status,
                  showcase,
                  wiki,
                  overview,
                };

                Object.entries(update).forEach(([key, value]) => {
                  if (value === '' || (Array.isArray(value) && !value.length)) {
                    delete update[key as keyof Exploit];
                  }
                });

                const result = await Exploits.update({
                  ...exploit,
                  ...update,
                });

                if (!result.ok) {
                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to update glitch.`,
                    },
                  );
                  return;
                }
              } else {
                const insert = await Exploits.create({
                  name,
                  aliases: aliases
                    .split(',')
                    .map((alias) => alias.trim())
                    .filter((alias) => alias),
                  type,
                  category,
                  status,
                  showcase,
                  wiki,
                  overview,
                });

                if (!insert.ok) {
                  await bot.helpers.editOriginalInteractionResponse(
                    interaction.token,
                    {
                      content: `❌️ Failed to insert new glitch.`,
                    },
                  );
                  return;
                }
              }

              exploit = await Exploits.find(name);
              if (!exploit) {
                await bot.helpers.editOriginalInteractionResponse(
                  interaction.token,
                  {
                    content: `❌️ Failed to ${isUpdate ? 'update' : 'add'} new glitch.`,
                  },
                );
                return;
              }

              const title = exploit.wiki ? `[${escapeMaskedLink(exploit.name)}](<${exploit.wiki}>)` : exploit.name;

              const video = exploit.wiki
                ? `[Watch Showcase](<${exploit.showcase}>)`
                : exploit.showcase
                ? `[Showcase](<${exploit.showcase}>)`
                : '';

              const description = exploit.overview ? `\n${exploit.overview}` : '';

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: [
                    `${isUpdate ? 'Updated' : 'Added'} glitch:`,
                    `${title}${description}\n${video}`,
                  ].join('\n'),
                },
              );
            } catch (err) {
              log.error(err);

              await bot.helpers.editOriginalInteractionResponse(
                interaction.token,
                {
                  content: `❌️ Failed to update or add glitch.`,
                },
              );
            }
            break;
          }
        }
        break;
      }
      default:
        break;
    }
  },
});
