import { Octokit } from 'npm:@octokit/core';
import { createAppAuth } from 'npm:@octokit/auth-app';

// This function expects:
//    - The app to be installed in the organization.
//    - The private key file to be in the root dir.
export const createGithubApp = async () => {
  const orgName = Deno.env.get('GITHUB_ORG_NAME')!;
  const privateKeyFile = Deno.env.get('GITHUB_APP_PRIVATE_KEY_PATH')!;
  const appId = Number(Deno.env.get('GITHUB_APP_ID')!);
  const privateKey = await Deno.readTextFile(privateKeyFile);
  const clientId = Deno.env.get('GITHUB_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')!;

  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      clientId,
      clientSecret,
    },
  });

  const { data: installations } = await appOctokit.request(
    `GET /app/installations`,
    {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  // deno-lint-ignore no-explicit-any
  const installationId = installations.find((installation: any) => installation.account.login === orgName)!.id;

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
};
