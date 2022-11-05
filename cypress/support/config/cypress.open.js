/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
// runs Cypress tests using Cypress Node module API
// https://on.cypress.io/module-api

const cypress = require('cypress')
const { getEnv } = require('./env')
const { getSpecPattern } = require('./helper')
const argv = require('minimist')(process.argv.slice(2))

async function runConfig(environment) {
  return {
    config: {
      e2e: {
        specPattern: getSpecPattern(environment),
      }
    },
    env: await getEnv(environment)
  }
}

async function options() {
  if (argv.env) {
    const environment = argv.env.toUpperCase()
    switch (environment) {

      case 'PROD-SMOKE':
      case 'PRODUCTION-SMOKE':
        const prodSmokeConfig = await runConfig('production')
        prodSmokeConfig.config.testFiles = ['cypress/e2e/login/*', 'cypress/e2e/registration/*']
        return prodSmokeConfig

      case 'LOCAL':
      case 'STAGING':
      case 'PROD':
      case 'PRODUCTION':
      case 'BRANCH':
        return await runConfig(environment)

      default:
        return await runConfig('LOCAL')
    }
  } else {
    console.error(
      '\nYou did not specifiy the ENVIRONMENT.\nPlease provide the ENVIRONMENT using the --env agrument.\nEg: --env=local , --env=staging\n'
    )
    process.exit(1)
  }
}

; (async () => {
  const openOptions = await options()
  console.log('Opening with the following config :\n', openOptions)

  await cypress.open(openOptions).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
})()
