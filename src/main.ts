import * as core from '@actions/core'
import { getContext, getOctokit } from './github.js'
import { run } from './run.js'
import * as github from "@actions/github"
import axios, { isAxiosError } from 'axios'

const main = async (): Promise<void> => {
  await validateSubscription()
  await run(
    {
      authors: core.getMultilineInput('authors'),
      startsWith: core.getMultilineInput('starts-with'),
      endsWith: core.getMultilineInput('ends-with'),
      contains: core.getMultilineInput('contains'),
      issueNumber: issueNumber(core.getInput('issue-number')),
    },
    getOctokit(),
    await getContext(),
  )
  core.setOutput('starts-with', core.getInput('starts-with'))
  core.setOutput('ends-with', core.getInput('ends-with'))
}

const issueNumber = (s: string): number | undefined => {
  if (!s) {
    return undefined
  }

  const n = parseInt(s, 10)
  if (Number.isNaN(n)) {
    throw new Error('issue-number is an invalid number')
  }
  if (!Number.isSafeInteger(n)) {
    throw new Error('issue-number is not a safe integer')
  }

  return n
}

async function validateSubscription() {
  const repoPrivate = github.context?.payload?.repository?.private;
  const upstream = 'gitleaks/gitleaks-action';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body: Record<string, string> = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
