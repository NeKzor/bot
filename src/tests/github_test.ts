/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import 'https://deno.land/std@0.190.0/dotenv/load.ts';
import { GitHub } from '../services/github.ts';

const issue = await GitHub.createIssue({
  owner: 'NeKzBot',
  repo: 'bot',
  issue: {
    title: 'Bug111',
    body: 'haha!',
  },
  token: Deno.env.get('GITHUB_ACCESS_TOKEN')!,
});

console.log(`Created issue ${issue.html_url}!`);
