/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { log } from "../utils/logger.ts";
import { db } from "./db.ts";

export interface Runtime {
  language: string;
  version: string;
  aliases: string[];
}

export interface ExecutionResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: unknown | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: unknown | null;
    output: string;
  };
}

export const Piston = {
  Version: "v2",
  Runtimes: [] as Runtime[],

  async load() {
    Piston.Runtimes = (await db.get<Runtime[]>(["piston"])).value ?? [];
  },
  async fetch() {
    const url = `https://emkc.org/api/${Piston.Version}/piston/runtimes`;
    log.info(`[GET] ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent": Deno.env.get("USER_AGENT")!,
      },
    });

    log.info("Fetched emkc.org data");

    await db.set(["piston"], await res.json());

    await Piston.load();
  },
  findRuntime(language: string) {
    return Piston.Runtimes.find((runtime) => {
      return runtime.language === language ||
        runtime.aliases.includes(language);
    });
  },
  async execute(runtime: Runtime, content: string) {
    const url = `https://emkc.org/api/${Piston.Version}/piston/execute`;
    log.info(`[POST] ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": Deno.env.get("USER_AGENT")!,
      },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            content: content,
          },
        ],
      }),
    });

    log.info("Executed code on emkc.org");

    return await res.json() as ExecutionResult;
  },
};
