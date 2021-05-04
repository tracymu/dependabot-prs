#!/usr/bin/env node

const { Octokit } = require("@octokit/rest")
const chalk = require('chalk')
const contrast = require('contrast')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const prompts = require('prompts')

// https://github.com/settings/tokens
const { DEPENDABOT_PRS_GITHUB_TOKEN, DEPENDABOT_PRS_REPOS = "" } = process.env
const repos = DEPENDABOT_PRS_REPOS.split(/\s+/).map(repo => repo.trim())

const owner = 'blake-education'

const octokit = new Octokit({
  auth: `token ${DEPENDABOT_PRS_GITHUB_TOKEN}`
})

function isDependabotPR({ labels }) {
  return labels.some((label) => label.name === 'dependencies')
}

async function getPull(repo, number) {
  const { data: { head: { sha }, labels, title, html_url: url, state } } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: number,
  })

  const { data: { state: status } } = await octokit.repos.getCombinedStatusForRef({
    owner,
    repo,
    ref: sha,
  })

  return { repo, number, labels, title, url, state, status }
}

async function getPullsForRepo(repo) {
  const { data: pulls } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
  })

  return (await Promise.all(pulls.map(async ({ head: { sha }, number, labels, title, html_url: url }) => {
    if (!isDependabotPR({ labels })) return

    const { data: { state: status } } = await octokit.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref: sha,
    })

    return { repo, number, labels, title, url, state: 'open', status }
  }))).flat().filter(Boolean)
}

async function getPullsForRepos() {
  return (await Promise.all(repos.map(getPullsForRepo))).flat()
}

function describePR({ repo, number, labels, title, url, status }) {
  const dotColor = {
    error: 'red',
    failure: 'red',
    success: 'green',
  }[status] ?? 'orange'

  const labelText = labels.map((label) => {
    const bgColor = `#${label.color}`
    const color = contrast(bgColor) === 'light' ? 'black' : 'white'
    return chalk.bgHex(bgColor).keyword(color)(label.name)
  }).join(' ')

  return `${chalk.blue(repo)}: ${chalk.magenta(`#${number}`)} ${chalk.bold(title)} ${chalk.keyword(dotColor)('•')} ${labelText} ${url}`
}

async function listPRs() {
  const pulls = await getPullsForRepos()

  for (const pull of pulls) {
    console.log(describePR(pull))
  }
}

async function approvePR({ repo, number }) {
  const pull = await getPull(repo, number)
  console.log(describePR(pull))

  if (pull.state !== 'open') {
    console.error(`#${number} is ${pull.state}!`)
    return
  }

  if (!isDependabotPR(pull)) {
    console.error(`#${number} is not a dependabot PR!`)
    return
  }

  if (pull.status !== 'success') {
    console.error(`#${number} has a failed check!`)
    return
  }

  const { confirmation } = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: 'Are you sure you want to approve this PR?',
  })

  if (!confirmation) return

  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: number,
    commit_id: pull.sha,
    event: 'APPROVE',
    body: "@dependabot merge",
  })

  console.log(`#${number} approved`)
}

yargs(hideBin(process.argv))
  .command('list', 'list PRs', () => {}, listPRs)
  .command('approve <repo> <number>', 'approve a PR', {
    repo: {
      describe: 'name of a repo',
      type: 'string',
    },
    number: {
      describe: 'number of PR',
      type: 'number',
    }
  }, (argv) => {
    // Required to prevent the command running in completion mode
    if ('getYargsCompletions' in argv) return
    return approvePR(argv)
  })
  .completion('completion', 'output completion stuff', (_, { _: argv }) => {
    if (argv[1] === 'approve' && argv.length > 2) {
      if (argv.length === 3) {
        return repos.map((repo) => `${repo}:`)
      } else if (argv.length === 4) {
        const repo = argv[2]
        return getPullsForRepo(repo).then((pulls) => {
          return pulls.map(({ number, title, status }) => `${number}:${title} (${status})`)
        })
      }
    } else if (argv.length === 2) {
      return ['list:list PRs', 'approve:approve a PR']
    }
  })
  .help()
  .argv
