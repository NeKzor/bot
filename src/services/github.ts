/*
 * Copyright (c) 2023-2024, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { logger } from '../utils/logger.ts';
import { Branch, Issue, Pull, Release } from './github_api.ts';

const log = logger({ name: 'GitHub' });

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

export type RepositoryIssue = Issue & { repository: string; project: string; search: string };
export type RepositoryPull = Pull & { repository: string; project: string; search: string };
export type RepositoryRelease = Release & { repository: string; project: string; search: string };
export type RepositoryBranch = Branch & {
  repository: string;
  project: string;
  search: string;
  id: string;
  html_url: string;
};

export const GitHub = {
  ApiVersion: '2022-11-28',
  BaseApi: 'https://api.github.com',

  Issues: {
    List: [] as RepositoryIssue[],
  },

  Pulls: {
    List: [] as RepositoryPull[],
  },

  Releases: {
    List: [] as RepositoryRelease[],
  },

  Branches: {
    List: [] as RepositoryBranch[],
  },

  Cache: new Map<string, number>(),

  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + Deno.env.get('GITHUB_ACCESS_TOKEN')!,
      'X-GitHub-Api-Version': this.ApiVersion,
      'User-Agent': Deno.env.get('USER_AGENT')!,
    };
  },

  async makeRequest<T>(repos: string[], path: string) {
    const headers = this.getHeaders();

    const url = `${this.BaseApi}/rate_limit`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, { headers });
    const rateLimit = await res.json();

    log.info(`Remaining: ${rateLimit.resources.core.remaining}`);

    if (rateLimit.resources.core.remaining === 0) {
      log.info('Rate limited');
      return;
    }

    const responses = await Promise.all(repos.map((repo) => {
      return fetch(`${this.BaseApi}/repos/${repo}/${path}?per_page=100&page=1`, { headers });
    }));

    return await Promise.all(responses.map((res) => res.json() as Promise<T>));
  },

  async fetchIssues() {
    const cache = this.Cache.get('issues');
    if (cache && cache > Date.now()) {
      return;
    }

    this.Cache.set('issues', Date.now() + 60_000);

    const issues = await this.makeRequest<RepositoryIssue[]>(repos, 'issues');
    if (!issues) {
      return;
    }

    this.Issues.List = issues
      .flatMap(
        (issues, idx) => {
          const issuesOnly: RepositoryIssue[] = [];
          issues.forEach((issue) => {
            if (issue.pull_request) {
              return;
            }
            issue.repository = repos[idx]!;
            issue.project = issue.repository.split('/').at(1)!;
            issue.search = `[${issue.project}] ${issue.title}`.slice(0, 100);
            issuesOnly.push(issue);
          });
          return issuesOnly;
        },
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    log.info('Loaded', this.Issues.List.length, 'issues');
  },

  async fetchPullRequests() {
    const cache = this.Cache.get('pulls');
    if (cache && cache > Date.now()) {
      return;
    }

    this.Cache.set('pulls', Date.now() + 60_000);

    const pulls = await this.makeRequest<RepositoryPull[]>(repos, 'pulls');
    if (!pulls) {
      return;
    }

    this.Pulls.List = pulls
      .flatMap(
        (pulls, idx) => {
          pulls.forEach((pull) => {
            pull.repository = repos[idx]!;
            pull.project = pull.repository.split('/').at(1)!;
            pull.search = `[${pull.project}] ${pull.title}`.slice(0, 100);
          });
          return pulls;
        },
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    log.info('Loaded', this.Pulls.List.length, 'pulls');
  },

  async fetchReleases() {
    const cache = this.Cache.get('releases');
    if (cache && cache > Date.now()) {
      return;
    }

    this.Cache.set('releases', Date.now() + 60_000);

    const releases = await this.makeRequest<RepositoryRelease[]>(reposWithReleases, 'releases');
    if (!releases) {
      return;
    }

    this.Releases.List = releases
      .flatMap(
        (releases, idx) => {
          releases.forEach((release) => {
            release.repository = reposWithReleases[idx]!;
            release.project = release.repository.split('/').at(1)!;
            release.search = `[${release.project}] ${release.name.length ? release.name : release.tag_name}`.slice(
              0,
              100,
            );
          });
          return releases;
        },
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    log.info('Loaded', this.Releases.List.length, 'releases');
  },

  async fetchBranches() {
    const cache = this.Cache.get('branches');
    if (cache && cache > Date.now()) {
      return;
    }

    this.Cache.set('branches', Date.now() + 60_000);

    const branches = await this.makeRequest<RepositoryBranch[]>(reposWithBranches, 'branches');
    if (!branches) {
      return;
    }

    this.Branches.List = branches
      .flatMap(
        (branches, idx) => {
          branches.forEach((branch) => {
            branch.repository = reposWithBranches[idx]!;
            branch.project = branch.repository.split('/').at(1)!;
            branch.search = `[${branch.project}] ${branch.name}`.slice(0, 100);
            branch.id = `${reposWithBranches[idx]}/${branch.name}`;
            branch.html_url = `https://github.com/${reposWithBranches[idx]}/commits/${branch.name}`;
          });
          return branches;
        },
      );

    log.info('Loaded', this.Branches.List.length, 'branches');
  },

  async load() {
    await this.fetchIssues();
    await this.fetchPullRequests();
    await this.fetchReleases();
    await this.fetchBranches();
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
