/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

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
    Piston.Runtimes = JSON.parse(await Deno.readTextFile("./data/piston.json"));
  },
  async fetch() {
    const res = await fetch(
      `https://emkc.org/api/${Piston.Version}/piston/runtimes`,
    );

    await Deno.writeTextFile(
      "./data/piston.json",
      JSON.stringify(await res.json()),
    );

    console.log("Fetched emkc.org data");

    await Piston.load();
  },
  findRuntime(language: string) {
    return Piston.Runtimes.find((runtime) => {
      return runtime.language === language ||
        runtime.aliases.includes(language);
    });
  },
  async execute(runtime: Runtime, content: string) {
    const res = await fetch(
      `https://emkc.org/api/${Piston.Version}/piston/execute`,
      {
        method: "POST",
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [
            {
              content: content,
            },
          ],
        }),
      },
    );

    console.log("Executed code on emkc.org");

    return await res.json() as ExecutionResult;
  },
};
