/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
// runs Cypress tests using Cypress Node module API
// https://on.cypress.io/module-api

const { getEnv } = require('./env')
const {
  getSpecPattern,
  getSpecExcludePattern,
  getTestsForShard,
  getSpecsFromUserInput,
  sleep
} = require('./helper')

const argv = require('minimist')(process.argv.slice(2))
const cyStaticConfig = require('../../../cypress.config')
const cypress = require('cypress')
const _ = require('lodash')
const chalk = require('chalk')
const axios = require('axios').default
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const browser = argv.browser || 'chrome'
const combineJunitReport = `combined-junit-${
  argv['buildkite-parallel-job'] || Date.now().toString()
}.xml`

/**
 * Given a runtime environment, get the specific config for running cypress
 * @param {string} environment - Which environment this is run in (i.e. BRANCH, STAGING, PRODUCTION)
 * @returns {Promise<Partial<CypressCommandLine.CypressRunOptions>>}
 */
async function getCypressRuntimeConfigForEnvironment(environment) {
  const specPattern = getSpecPattern(environment)
  const spec = argv.spec ? await getSpecsFromUserInput(argv.spec) : undefined

  const cypressRuntimeOptions = {
    browser,
    env: await getEnv(environment)
  }

  if (environment === 'LOCAL') {
    return {
      ...cypressRuntimeOptions,
      'no-exit': true,
      config: {
        e2e: { specPattern: spec || specPattern }
      }
    }
  }

  const excludeSpecPattern = getSpecExcludePattern(environment)
  const shardTests = await getTestsForShard(
    specPattern,
    argv['buildkite-parallel-job-count'],
    argv['buildkite-parallel-job']
  )

  return {
    ...cypressRuntimeOptions,
    config: {
      e2e: { specPattern: spec || shardTests, excludeSpecPattern }
    }
  }
}

/**
 * Retrieves the runtime environment and gets the config for cypress to run
 * @returns {Promise<Partial<CypressCommandLine.CypressRunOptions>>}
 */
async function generateCypressRuntimeConfig() {
  if (argv.env) {
    const environment = argv.env.toUpperCase()
    switch (environment) {
      case 'LOCAL':
      case 'PROD-SMOKE':
      case 'PRODUCTION-SMOKE':
      case 'PROD':
      case 'PRODUCTION':
      case 'STAGING':
      case 'BRANCH':
        return await getCypressRuntimeConfigForEnvironment(environment)

      default:
        console.warn(
          `Environment did not match an expected value, defaulting to STAGING. Environment provided (${argv.env})`
        )
        return await getCypressRuntimeConfigForEnvironment('STAGING')
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

/**
 * A wrapper for the Cypress Run command to retry failed spec more before declaring them failed
 * @param {number} iteration - The iteration of test running (provide 0 to start)
 * @param {*} spec - Optional spec pattern (provided on retries for a subset run)
 * @returns - recursive call to itself
 */
const runCypressWithRetryWrapper = async (iteration, spec) => {
  iteration += 1

  config = defaultConfig
  config.env.numRuns = iteration

  if (spec) config.spec = spec

  console.log('--- Cypress Config')
  console.log('Running with the following config :\n', util.inspect(config, false, null, true))

  console.log('+++ Running E2E Tests')
  return cypress
    .run(config)
    .then(results => {
      // ============
      // Rerun Logic
      // ============
      if (results.totalFailed) {
        totalFailuresIncludingRetries += results.totalFailed

        console.log(`Run #${iteration} failed.`)

        // If this is final retry and theres failures then just exit
        if (iteration >= maxRetries) {
          console.log(
            `Ran a total of '${maxRetries}' times but still have failures. Exiting with exit code ${totalFailuresIncludingRetries}\n`
          )

          //merge all individual junit xml files into one combined file at the end of all retries
          // exec(
          //   `jrm ./${cyStaticConfig.parentReportFolder}/${combineJunitReport} "./${cyStaticConfig.parentReportFolder}/${cyStaticConfig.junitReportFolder}/*.xml"`
          // )

          return process.exit(totalFailuresIncludingRetries)
        }

        // Rerun again with only the failed tests
        const specs = _(results.runs).filter('stats.failures').map('spec.relative').value()

        console.log(`\nRetrying '${specs.length}' specs...`)
        console.log(specs)

        return runCypressWithRetryWrapper(iteration, specs)
      }
    })
    .catch(err => {
      console.error(err.message)
      process.exit(1)
    })
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

async function main() {
  defaultConfig = await generateCypressRuntimeConfig()

  if (argv.env.toUpperCase() === 'BRANCH') {
    console.log('--- :hospital: Checking Service Health')
    await checkApplicationHealth(defaultConfig)
  }

  await runCypressWithRetryWrapper(0)
}

main()
