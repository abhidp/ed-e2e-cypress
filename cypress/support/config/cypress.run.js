/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
// runs Cypress tests using Cypress Node module API
// https://on.cypress.io/module-api

const { getEnv } = require('./env')
const { getTestsForShard, getProdSpecFiles } = require('./helper')

const argv = require('minimist')(process.argv.slice(2))
const cypress = require('cypress')
const _ = require('lodash')
const chalk = require('chalk')
const axios = require('axios').default
const util = require('util')
const browser = argv.browser || 'chrome'

async function runConfig(environment) {
  let excludeSpecPattern = ['cypress/e2e/excluded-tests/*.cy.ts']

  const shardTests = await getTestsForShard(
    '**/*.cy.ts',
    argv['buildkite-parallel-job-count'],
    argv['buildkite-parallel-job']
  )

  return {
    browser,
    spec: argv.spec ? `cypress/e2e/**/${argv.spec}` : undefined,
    config: {
      e2e: { specPattern: shardTests, excludeSpecPattern }
    },
    env: await getEnv(environment)
  }
}

async function options() {
  if (argv.env) {
    switch (argv.env.toUpperCase()) {
      case 'LOCAL':
        return {
          browser,
          'no-exit': true,
          spec: argv.spec ? `cypress/e2e/**/${argv.spec}` : undefined,
          config: {
            e2e: { specPattern: '**/*.cy.ts' }
          },
          env: await getEnv('LOCAL')
        }

      case 'STAGING':
        stagingConfig = await runConfig('staging')
        return stagingConfig

      case 'PROD-SMOKE':
      case 'PRODUCTION-SMOKE':
        const prodSmokeSpecs = await getProdSpecFiles()
        prodSmokeConfig = await runConfig('production')
        prodSmokeConfig.config.e2e.specPattern = await getTestsForShard(
          prodSmokeSpecs,
          argv['buildkite-parallel-job-count'],
          argv['buildkite-parallel-job']
        )

        return prodSmokeConfig

      case 'PROD':
      case 'PRODUCTION':
        return await runConfig('production')

      case 'BRANCH':
        branchConfig = await runConfig('branch')
        branchConfig.config.e2e.excludeSpecPattern = [
          'cypress/e2e/**/*.experiment.cy.ts',
          'cypress/e2e/**/learners-sso.cy.ts', // learner sso tests cannot run on branch because Microsoft Azure AD callback URL has to be setup individual branches separately
          'cypress/e2e/**/deferred-deeplink.cy.ts', // deeplinks cannot run on branch because branc.io urls are only setup for master branch
          'cypress/e2e/**/v1-api-deeplink-to-lesson.cy.ts',
          'cypress/e2e/**/deeplinks.cy.ts',
          'cypress/e2e/**/invite-link-course-preview.cy.ts', // invite link URL are only setup for master not for branch
          'cypress/e2e/**/lms-registration-and-onboarding.cy.ts', //invite link doesn't work on feature branches
          'cypress/e2e/excluded-tests/*.cy.ts'
        ]
        return branchConfig

      default:
        return {
          browser,
          spec: argv.spec ? `cypress/e2e/**/${argv.spec}` : undefined,
          config: {
            e2e: { specPattern: shardTests, excludeSpecPattern }
          },
          env: await getEnv('STAGING')
        }
    }
  } else {
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

/*
 * Add your config args in defaultConfig
 * Set number of retries in maxRetries
 */

const maxRetries = 3
let defaultConfig, config
let totalFailuresIncludingRetries = 0

const cypressRun = async (num, spec) => {
  num += 1

  config = defaultConfig
  config.env.numRuns = num

  if (spec) config.spec = spec
  console.log('Running with the following config :\n', util.inspect(config, false, null, true))

  return cypress
    .run(config)
    .then(results => {
      // ============
      // Rerun Logic
      // ============
      if (results.totalFailed) {
        totalFailuresIncludingRetries += results.totalFailed

        // rerun again with only the failed tests
        const specs = _(results.runs).filter('stats.failures').map('spec.relative').value()

        console.log(`Run #${num} failed.`)

        // if this is the 3rd total run (2nd retry)
        // and we've still got failures then just exit
        if (num >= maxRetries) {
          console.log(
            `Ran a total of '${maxRetries}' times but still have failures. Exiting with exit code ${totalFailuresIncludingRetries}\n`
          )

          return process.exit(totalFailuresIncludingRetries)
        }

        console.log(`\nRetrying '${specs.length}' specs...`)
        console.log(specs)

        return cypressRun(num, specs)
      }
    })
    .catch(err => {
      console.error(err.message)
      process.exit(1)
    })
}

async function run() {
  defaultConfig = await options()

  if (argv.env.toUpperCase() === 'BRANCH') {
    console.log('--- :hospital: Checking Service Health')
    await checkApplicationHealth(defaultConfig)
  }

  console.log('+++ Running E2E Tests')
  await cypressRun(0)
}

/**
 * Small wrapper to test the health check endpoint for each of the services required to run tests
 * @param {Partial<CypressCommandLine.CypressRunOptions>} defaultConfig - Configuration options for the cypress runner
 */
async function checkApplicationHealth(defaultConfig) {
  await checkServerStatus('Hippo', defaultConfig.env.HIPPO, '/health')
  await checkServerStatus('Emily Api', defaultConfig.env.EMILY_API, '/health')
  await checkServerStatus('Learners App', defaultConfig.env.LEARNERS_APP, '/health')
  await checkServerStatus('Website', defaultConfig.env.WEBSITE, '/health')
  await checkServerStatus('Public Api', defaultConfig.env.PUBLIC_API, '/health')
  await checkServerStatus('LMS', defaultConfig.env.LMS, '/health')
}

/**
 * Attempts to reach a service via HTTP call to ensure its up before running tests
 * @param {string} serviceName - The human readable name for the service
 * @param {string} serviceBaseUrl - The base url for the service
 * @param {string} serviceHealthCheckRoute - The route for the service's health check endpoint
 */
async function checkServerStatus(serviceName, serviceBaseUrl, serviceHealthCheckRoute) {
  console.log(`~~~ ${serviceName} Health Check`)
  var sleepTimeMs = 10000

  let attempts = 5
  console.log(
    chalk.keyword('blue')(
      `Checking ${serviceName} (${serviceBaseUrl + serviceHealthCheckRoute}) status`
    )
  )
  do {
    try {
      await axios({
        method: 'get',
        url: serviceBaseUrl + serviceHealthCheckRoute
      })
      break
    } catch (err) {
      console.log(
        chalk.keyword('yellow')(
          `\nError response from ${serviceName}. Retrying after short delay.\n\tRequest Error: (${err})`
        )
      )

      attempts--
      console.log(chalk.keyword('gray')(`Attemps remaining: ${attempts}`))
      if (attempts != 0) {
        console.log(chalk.keyword('grey')(`Sleeping for ${sleepTimeMs}ms...`))
        await sleep(sleepTimeMs)
      }
    }
  } while (attempts > 0)

  const successfulCheck = attempts > 0
  if (successfulCheck) {
    console.log(chalk.keyword('green')(`Successful response from ${serviceName}.`))
  } else {
    console.log(chalk.keyword('red')(`No response from ${serviceName} on any attempts.`))
    console.log('^^^ +++')
    process.exit(1)
  }
}

/**
 * Helper to halt execution for the specified time
 * @param {number} msec - Millisecond count for the sleep period
 */
async function sleep(msec) {
  return new Promise(resolve => setTimeout(resolve, msec))
}

run()
