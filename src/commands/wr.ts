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

const findWr = (query: string) => {
  const results = [];

  for (const map of Portal2Campaign.map_list) {
    const cmName = map.cm_name.toLocaleLowerCase();
    const tlc = map.three_letter_code.toLocaleLowerCase();

    if (
      cmName.startsWith(query) ||
      cmName.replaceAll(" ", "").startsWith(query) ||
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
  name: "wr",
  description: "Get the latest wr video on autorender.portal2.sr.",
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

        console.log({ query });

        await bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          {
            type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
            data: {
              choices: Portal2Campaign.map_list
                .filter((map) => {
                  const cmName = map.cm_name.toLocaleLowerCase();
                  const tlc = map.three_letter_code.toLocaleLowerCase();

                  return cmName.startsWith(query) ||
                    cmName.replaceAll(" ", "").startsWith(query) ||
                    tlc === query;
                })
                .slice(0, 5)
                .map((map) => {
                  return {
                    name: map.cm_name,
                    value: map.cm_name,
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
        )?.value?.toString()?.toLowerCase() ?? "";

        const wrMaps = findWr(query);
        const wrMap = wrMaps.at(0);

        if (!wrMap) {
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

        if (wrMaps.length > 1) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content:
                  `❌️ Your query matched too many results. Please choose a result from the autocompletion.`,
              },
            },
          );
          return;
        }

        const q = encodeURIComponent(`wr ${query}`);
        try {
          const res = await fetch(
            `https://autorender.portal2.sr/api/v1/search?q=${q}`,
          );

          if (!res.ok) {
            throw new Error(
              `Failed to fetch videos on autorender.portal2.sr with query: ${q}`,
            );
          }

          interface SearchResponse {
            end: false;
            results: {
              comment: string;
              cur_rank: number;
              date: string;
              id: number;
              map: string;
              map_id: number;
              obsoleted: number;
              orig_rank: number;
              time: number;
              user: string;
              user_id: string;
              views: number;
            }[];
          }

          const search = await res.json() as SearchResponse;

          const wr = search.results.at(0);
          if (!wr) {
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

          const formatTime = (time: number) => {
            const cs = time % 100;
            const secs = Math.floor(time / 100);
            const sec = secs % 60;
            const min = Math.floor(secs / 60);
            return (min > 0)
              ? `${min}:${((sec < 10) ? `0${sec}` : `${sec}`)}.${((cs < 10)
                ? `0${cs}`
                : `${cs}`)}`
              : `${sec}.${((cs < 10) ? `0${cs}` : `${cs}`)}`;
          };

          const map = escapeMaskedLink(wr.map);
          const mapLink = escapeMaskedLink(
            `https://board.portal2.sr/chamber/${wr.map_id}`,
          );

          const time = escapeMaskedLink(formatTime(wr.time));
          const videoLink =
            `https://autorender.portal2.sr/video.html?v=${wr.id}`;

          const playerName = escapeMaskedLink(wr.user);
          const profileLink = `https://board.portal2.sr/profile/${wr.user_id}`;

          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content:
                  `[${map}](<${mapLink}>) in [${time}](${videoLink}) by [${playerName}](<${profileLink}>)`,
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
