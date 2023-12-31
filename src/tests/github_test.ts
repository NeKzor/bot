/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'dotenv/load.ts';
import { GitHub } from '../services/github.ts';

const token = Deno.env.get('GITHUB_ACCESS_TOKEN')!;

if (token === 'false') {
  console.log('Skipped GitHub test because GITHUB_ACCESS_TOKEN was not set.');
  Deno.exit(0);
}

const issue = await GitHub.createIssue({
  owner: 'NeKzBot',
  repo: 'bot',
  issue: {
    title: 'Bug111',
    body: 'haha!',
  },
  token,
});

console.log(`Created issue ${issue.html_url}!`);
