/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

const defaultSplitCharacter = " ";
const defaultMaxItems = 5;

export const createAutocompletion = <T>(
  options: {
    items: () => T[];
    idKey: Extract<keyof T, string | number>;
    nameKey: Extract<keyof T, string>;
    maxItems?: number;
    splitCharacter?: string;
    additionalCheck?: (item: T, query: string) => boolean;
  },
) => {
  const { items, idKey, nameKey, additionalCheck } = options;

  const splitCharacter = options.splitCharacter ?? defaultSplitCharacter;
  const maxItems = options.maxItems ?? defaultMaxItems;

  return (
    { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
  ) => {
    const list = items();

    if (query.length === 0) {
      return list.slice(0, maxItems);
    }

    const exactMatch = list
      .find((item) => (item[nameKey] as string).toLowerCase() === query);

    if (exactMatch) {
      return [exactMatch];
    }

    const results = [];

    for (const item of list) {
      // TODO: I don't think this is needed anymore?
      if (isAutocomplete && item[idKey]?.toString() === query) {
        return [item];
      }

      const name = (item[nameKey] as string).toLowerCase();

      if (
        name.startsWith(query) ||
        name.split(splitCharacter).includes(query) ||
        (additionalCheck && additionalCheck(item, query))
      ) {
        results.push(item);
      }

      if (results.length === maxItems) {
        break;
      }
    }

    return results;
  };
};
