const defaultMaximumAutocompleteResults = 5;

export const createAutocompletion = <T extends { name: string; id: string }>(
  getList: () => T[],
  maximumAutocompleteResults = defaultMaximumAutocompleteResults,
) => {
  const list = getList();

  return (
    { query, isAutocomplete }: { query: string; isAutocomplete: boolean },
  ) => {
    if (query.length === 0) {
      return list.slice(0, maximumAutocompleteResults);
    }

    const exactMatch = list
      .find((item) => item.name.toLowerCase() === query);

    if (exactMatch) {
      return [exactMatch];
    }

    const results = [];

    for (const item of list) {
      if (isAutocomplete && item.id.toString() === query) {
        return [item];
      }

      const name = item.name.toLowerCase();

      if (
        name.startsWith(query) ||
        name.split(" ").includes(query)
      ) {
        results.push(item);
      }

      if (results.length === maximumAutocompleteResults) {
        break;
      }
    }

    return results;
  };
};
