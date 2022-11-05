/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const argv = require('minimist')(process.argv.slice(2))
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const fs = require('fs')
const dotenv = require('dotenv')
const path = require('path')
const e2eFolder = 'cypress/e2e/'

let envConfig

try {
  envConfig = dotenv.parse(fs.readFileSync('.env'))
} catch (error) {
  console.error('\nERROR: .env file not found')
  console.error('run `yarn get:secrets` to download .env file\n')
  process.exit(1)
}

/**
 * Given a runtime environment, retreive the spec pattern(s) to run
 * @param {string} environment - Which environment this is run in (i.e. BRANCH, STAGING, PRODUCTION)
 * @returns A spec pattern to run
 */
function getSpecPattern(environment) {
  switch (environment.toUpperCase()) {
    case 'PROD-SMOKE':
    case 'PRODUCTION-SMOKE':
      const prodSpecsToRun = []

      const foldersToRun = [
        'cypress/e2e/login',
        'cypress/e2e/registration',
        'cypress/e2e/deeplinks'
      ]
      foldersToRun.forEach(dir => {
        fs.readdirSync(dir).forEach(file => {
          if (file.endsWith('.cy.ts')) {
            prodSpecsToRun.push(`${dir}/${file}`)
          }
        })
      })

      return prodSpecsToRun

    case 'LOCAL':
    case 'BRANCH':
    case 'STAGING':
    case 'PROD':
    case 'PRODUCTION':
      return '**/*.cy.ts'

    default:
      console.error(
        `
        You did not specifiy the ENVIRONMENT.
        Please provide any one of the following ENVIRONMENT values using the --env agrument:
        local, staging, ci, branch, prod
        Eg: --env=local , --env=staging
        `
      )
      process.exit(1)
  }
}

/**
 * Given a runtime environment, retrieve the spec patterns to exclude
 * @param {string} environment - Which environment this is run in (i.e. BRANCH, STAGING, PRODUCTION)
 * @returns A spec pattern to exclude
 */
function getSpecExcludePattern(environment) {
  const excludeSpecPattern = ['cypress/e2e/excluded-tests/*.cy.ts']

  if (environment === 'BRANCH') {
    excludeSpecPattern.push(
      'cypress/e2e/**/*.experiment.cy.ts',
      'cypress/e2e/**/learners-sso.cy.ts', // learner sso tests cannot run on branch because Microsoft Azure AD callback URL has to be setup individual branches separately
      'cypress/e2e/**/deferred-deeplink.cy.ts', // deeplinks cannot run on branch because branc.io urls are only setup for master branch
      'cypress/e2e/**/v1-api-deeplink-to-lesson.cy.ts',
      'cypress/e2e/**/deeplinks.cy.ts',
      'cypress/e2e/**/invite-link-course-preview.cy.ts', // invite link URL are only setup for master not for branch
      'cypress/e2e/**/lms-registration-and-onboarding.cy.ts', //invite link doesn't work on feature branches
      'cypress/e2e/**/create-edit-delete-banner.cy.ts' // skipped e2e, it is under maintance see (https://bitbucket.org/ed-app/ed/pull-requests/9426)
    )
  }

  return excludeSpecPattern
}

async function getShortBranchName(full_branch_name) {
  const { stdout } = await exec(`bash cypress/support/config/get-branch-tag.sh ${full_branch_name}`)
  return stdout.trim()
}

async function getSecrets(environment) {
  for (const envName in envConfig) {
    process.env[`CYPRESS_${envName}`] = envConfig[envName] //Cypress-level environment variables required by Cypress.env()
    process.env[envName] = envConfig[envName] //OS-level System environment variables required by Node process.env and CI
  }

  process.env['CYPRESS_CI'] = process.env.CI

  environment.substr(0, 4) === 'prod' ? (environment = 'PROD') : (environment = 'STAGING')
}

/**
 * Given a selection of tests, extract a subset of the tests using a round robin
 * to divy up tests across parallel test runners. This is a rudimentary split of
 * E2E tests which doesn't account for anything like time, cost, etc
 * @param {*} tests - Either array of test file names including path OR glob string
 * @param {*} parallel_job_count - number of parallel runners in group
 * @param {*} parallel_job_id - Zero indexed parallel runner ID
 * @returns
 */
async function getTestsForShard(tests, parallel_job_count, parallel_job_id) {
  let sanitised_tests = []
  let tests_for_shard = []

  if (Array.isArray(tests)) {
    sanitised_tests = tests // Assuming an array of spec files passed in
  } else {
    if (tests === '**/*.cy.ts') {
      // Expand glob to all matching spec files
      try {
        sanitised_tests = await getAllSpecFiles()
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Find test names for this shard to run
  sanitised_tests.forEach((test, i) => {
    if (getShardIdForTest(i, parallel_job_count) == parallel_job_id) {
      tests_for_shard.push(test)
    }
  })

  return tests_for_shard
}

function getShardIdForTest(test_index, parallel_job_count) {
  if (test_index < parallel_job_count) {
    return test_index
  }

  while (test_index >= parallel_job_count) {
    test_index -= parallel_job_count
  }

  return test_index
}

/**
 * Get all the filenames for all specs in the E2E test folder
 * @returns array of filenames
 */
async function getAllSpecFiles() {
  // const { stdout } = await exec(`ls -- ${e2eFolder}**/*.cy.ts`)
  const { stdout } = await exec(`ls -- ${e2eFolder}profile/*.cy.ts`)

  return stdout
    .split('\n')
    .filter(String)
    .map(path => path.replace(' ', ''))
}

/**
 * Get an array specs to run based on the user parameter for the --spec argument from command line
 * @param {*} commaSeparatedSpecNames - A comma separated list of spec names passed in from the command line to the --spec argument
 * @returns array of filenames
 */

async function getSpecsFromUserInput(commaSeparatedSpecNames) {
  return commaSeparatedSpecNames
    .split(',')
    .filter(String)
    .map(filename => `${e2eFolder}${filename}`.replace(' ', ''))
}

/**
 * Helper to halt execution for the specified time
 * @param {number} msec - Millisecond count for the sleep period
 */
async function sleep(msec) {
  return new Promise(resolve => setTimeout(resolve, msec))
}

module.exports = {
  getSpecPattern,
  getSpecExcludePattern,
  getShortBranchName,
  getSecrets,
  getTestsForShard,
  getSpecsFromUserInput,
  sleep
}
