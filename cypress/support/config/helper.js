/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const argv = require('minimist')(process.argv.slice(2))
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const fs = require('fs')
const dotenv = require('dotenv')
let envConfig

try {
  envConfig = dotenv.parse(fs.readFileSync('.env'))
} catch (error) {
  console.error('\nERROR: .env file not found')
  console.error('run `yarn get:secrets` to download .env file\n')
  process.exit(1)
}

async function getProdSpecFiles() {
  let prodSpecsToRun = []

  const foldersToRun = ['cypress/e2e/login', 'cypress/e2e/registration', 'cypress/e2e/deeplinks']
  foldersToRun.forEach((dir, i) => {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.cy.ts')) {
        prodSpecsToRun.push(`${dir}/${file}`)
      }
    })
  })

  return prodSpecsToRun
}

async function getShortBranchName(FULL_BRANCH_NAME) {
  const { stdout } = await exec(`bash cypress/support/config/get-branch-tag.sh ${FULL_BRANCH_NAME}`)
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
  const e2eFolder = `cypress/e2e`

  let sanitised_tests = []
  let tests_for_shard = []

  if (Array.isArray(tests)) {
    sanitised_tests = tests // Assuming an array of spec files passed in
  } else {
    if (tests === '**/*.cy.ts') {
      // Expand glob to all matching spec files
      try {
        const { stdout } = await exec(`ls -- ${e2eFolder}/**/*.cy.ts`)

        sanitised_tests = stdout
          .split('\n')
          .filter(String)
          .map(path => path.replace(' ', ''))
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

module.exports = {
  getShortBranchName,
  getSecrets,
  getTestsForShard,
  getProdSpecFiles
}
