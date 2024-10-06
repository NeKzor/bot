/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { GitHub } from '../src/services/github.ts';

Deno.test.ignore('Create issue by owner', async () => {
  const token = Deno.env.get('GITHUB_ACCESS_TOKEN')!;

  const issue = await GitHub.createIssueByOwner(token, {
    owner: 'NeKzBot',
    repo: 'bot',
    issue: {
      title: 'Bug111',
      body: 'haha!',
    },
  });

  console.log(`Created issue ${issue.html_url}!`);
});

Deno.test.ignore('Create issue by app', async () => {
  const issue = await GitHub.createIssue({
    owner: 'p2sr',
    repo: 'bot-test',
    issue: {
      title: 'another bug',
      body: 'bbbbbb',
      labels: ['new-label'],
    },
  });

  console.log(`Created issue ${issue.html_url}!`);
});
