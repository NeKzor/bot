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
} from "../deps.ts";
import { createCommand } from "./mod.ts";
import { escapeMaskedLink } from "../utils/helpers.ts";
import Portal2Campaign from "../data/portal2_campaign.json" assert {
  type: "json",
};

const maximumAutocompleteResults = 5;

const findLp = (
  { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
) => {
  if (query.length === 0) {
    return Portal2Campaign.map_list.slice(0, maximumAutocompleteResults);
  }

  const results = [];

  for (const map of Portal2Campaign.map_list) {
    if (!isAutocomplete && map.sort_index.toString() === query) {
      return [map];
    }

    const cmName = map.cm_name.toLocaleLowerCase();
    const tlc = map.three_letter_code.toLocaleLowerCase();

    if (
      cmName.startsWith(query) ||
      cmName.replaceAll(" ", "") === query ||
      cmName.split(" ").includes(query) ||
      tlc === query
    ) {
      results.push(map);
    }

    if (results.length === maximumAutocompleteResults) {
      break;
    }
  }

  return results;
};

createCommand({
  name: "lp",
  description: "Find the latest LP record on lp.nekz.me.",
  type: ApplicationCommandTypes.ChatInput,
  scope: "Global",
  options: [
    {
      name: "query",
      description: "Search query.",
      type: ApplicationCommandOptionTypes.String,
      autocomplete: true,
      required: true,
    },
  ],
  execute: async (bot: Bot, interaction: Interaction) => {
    const command = interaction.data!;
    const args = [...(command.options?.values() ?? [])];

    switch (interaction.type) {
      case InteractionTypes.ApplicationCommandAutocomplete: {
        const query = args.find((arg) =>
          arg.name === "query"
        )?.value?.toString()?.toLowerCase() ?? "";

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
            data: {
              choices: findLp({ query, isAutocomplete: true })
                .map((map) => {
                  return {
                    name: map.cm_name,
                    value: map.sort_index.toString(),
                  } as ApplicationCommandOptionChoice;
                }),
            },
          },
        );
        break;
      }
      case InteractionTypes.ApplicationCommand: {
        const args = [...(command.options?.values() ?? [])];
        const query = args.find((arg) =>
          arg.name === "query"
        )?.value?.toString() ?? "";

        try {
          const lpMaps = findLp({ query, isAutocomplete: false });
          const lpMap = lpMaps.at(0);

          if (!lpMap) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Map not found.`,
                },
              },
            );
            return;
          }

          if (lpMaps.length > 1) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content:
                    `❌️ Your query matched too many results. Please choose a result from autocompletion.`,
                },
              },
            );
            return;
          }

          const lp = lpMap?.lp_record;
          if (!lp?.videoLink) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: `❌️ Video not found.`,
                },
              },
            );
            return;
          }

          const player1 = lp.player.id
            ? `[${
              escapeMaskedLink(lp.player.name)
            }](<https://lp.nekz.me/@/${lp.player.id}>)`
            : lp.player?.name ?? null;

          const player2 = lp.player2?.id
            ? `[${
              escapeMaskedLink(lp.player2.name)
            }](<https://lp.nekz.me/@/${lp.player2.id}>)`
            : lp.player2?.name ?? null;

          const players = [player1, player2].filter((player) => player).join(
            " and ",
          );

          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: `${
                  lpMap!.cm_name
                } in [${lp.portals} portals](${lp.videoLink}) by ${players}`,
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
                content: `❌️ Failed to fetch videos.`,
              },
            },
          );
        }
        break;
      }
      default:
        break;
    }
  },
});
