import * as core from '@actions/core'
import { run } from './run.js'
import axios, { isAxiosError } from 'axios'

const main = async (): Promise<void> => {
  await validateSubscription()
  await run({
    authors: core.getMultilineInput('authors'),
    startsWith: core.getMultilineInput('starts-with'),
    endsWith: core.getMultilineInput('ends-with'),
    contains: core.getMultilineInput('contains'),
    issueNumber: issueNumber(core.getInput('issue-number')),
    token: core.getInput('token', { required: true }),
  })
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

async function validateSubscription(): Promise<void> {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`

  try {
    await axios.get(API_URL, { timeout: 3000 })
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error('Subscription is not valid. Reach out to support@stepsecurity.io')
      process.exit(1)
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.')
    }
  }
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
