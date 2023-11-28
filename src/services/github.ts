/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from '../utils/logger.ts';
import { Branch, Issue, Pull, Release } from './github_api.ts';

const repos = [
  'p2sr/SourceAutoRecord',
  'p2sr/portal2-mtriggers',
  'p2sr/srconfigs',
  'p2sr/Portal2SpeedrunMod',
  'p2sr/rules',
  'p2sr/mdp',
  'p2sr/demofixup',
];

const reposWithReleases = [
  'p2sr/SourceAutoRecord',
  'p2sr/srconfigs',
  'p2sr/Portal2SpeedrunMod',
  'p2sr/mdp',
  'p2sr/demofixup',
];

const reposWithBranches = [
  'p2sr/SourceAutoRecord',
];

export const GitHub = {
  ApiVersion: '2022-11-28',
  BaseApi: 'https://api.github.com',

  Issues: {
    List: [] as Issue[],
  },

  Pulls: {
    List: [] as Pull[],
  },

  Releases: {
    List: [] as Release[],
  },

  Branches: {
    List: [] as (Branch & { id: string; html_url: string })[],
  },

  async loadAll() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + Deno.env.get('GITHUB_ACCESS_TOKEN')!,
      'X-GitHub-Api-Version': this.ApiVersion,
      'User-Agent': Deno.env.get('USER_AGENT')!,
    };

    const res = await fetch(`${this.BaseApi}/rate_limit`, { headers });
    const rateLimit = await res.json();

    log.info(`[GitHub] Remaining: ${rateLimit.resources.core.remaining}`);

    if (rateLimit.resources.core.remaining === 0) {
      log.info('[GitHub] Rate limited');
      return;
    }

    const responses = await Promise.all(repos.map((repo) => {
      return fetch(`${this.BaseApi}/repos/${repo}/issues?per_page=100&page=1`, { headers });
    }));

    this.Issues.List = (await Promise.all(responses.map((res) => res.json() as Promise<Issue[]>))).flatMap(
      (issues, idx) => {
        issues.forEach((issue) => {
          issue.title = `[${repos[idx].split('/').at(1)}] ${issue.title}`.slice(0, 100);
        });
        return issues;
      },
    );

    const pullResponses = await Promise.all(repos.map((repo) => {
      return fetch(`${this.BaseApi}/repos/${repo}/pulls?per_page=100&page=1`, { headers });
    }));

    this.Pulls.List = (await Promise.all(pullResponses.map((res) => res.json() as Promise<Pull[]>))).flatMap(
      (pulls, idx) => {
        pulls.forEach((pull) => {
          pull.title = `[${repos[idx].split('/').at(1)}] ${pull.title}`.slice(0, 100);
        });
        return pulls;
      },
    );

    const releaseResponses = await Promise.all(reposWithReleases.map((repo) => {
      return fetch(`${this.BaseApi}/repos/${repo}/releases?per_page=100&page=1`, { headers });
    }));

    this.Releases.List = (await Promise.all(releaseResponses.map((res) => res.json() as Promise<Release[]>))).flatMap(
      (releases, idx) => {
        releases.forEach((release) => {
          release.name = `[${reposWithReleases[idx].split('/').at(1)}] ${release.name}`.slice(0, 100);
        });
        return releases;
      },
    );

    const branchResponses = await Promise.all(reposWithBranches.map((repo) => {
      return fetch(`${this.BaseApi}/repos/${repo}/branches?per_page=100&page=1`, { headers });
    }));

    this.Branches.List = (await Promise.all(
      branchResponses.map((res) => res.json() as Promise<(Branch & { id: string; html_url: string })[]>),
    )).flatMap(
      (branches, idx) => {
        branches.forEach((branch) => {
          branch.id = `${reposWithBranches[idx]}/${branch.name}`;
          branch.html_url = `https://github.com/${reposWithBranches[idx]}/commits/${branch.name}`;
          branch.name = `[${repos[idx].split('/').at(1)}] ${branch.name}`.slice(0, 100);
        });
        return branches;
      },
    );

    log.info('[GitHub] Loaded', this.Issues.List.length, 'issues');
    log.info('[GitHub] Loaded', this.Pulls.List.length, 'pulls');
    log.info('[GitHub] Loaded', this.Releases.List.length, 'releases');
    log.info('[GitHub] Loaded', this.Branches.List.length, 'branches');
  },

  async createIssue(
    options: {
      owner: string;
      repo: string;
      issue: {
        title: string;
        body: string;
        labels?: string[];
      };
      token: string;
    },
  ): Promise<Issue> {
    const { owner, repo, issue, token } = options;

    const url = `${this.BaseApi}/repos/${owner}/${repo}/issues`;
    const body = JSON.stringify(issue);

    log.info(`[POST] ${url} : ${body}`);

    const res = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': this.ApiVersion,
          'User-Agent': Deno.env.get('USER_AGENT')!,
        },
        body,
      },
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(
        `Failed to create issue. Status: ${res.status}\n${error}`,
      );
    }

    return await res.json();
  },
};
