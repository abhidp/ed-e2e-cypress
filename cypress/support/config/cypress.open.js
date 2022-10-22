/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
// runs Cypress tests using Cypress Node module API
// https://on.cypress.io/module-api

const cypress = require('cypress')
const { getEnv } = require('./env')
const argv = require('minimist')(process.argv.slice(2))

let localConfig, branchConfig, prodSmokeConfig

async function runConfig(environment) {
  return {
    config: {
      e2e: {
        specPattern: '**/*.cy.ts',
        excludeSpecPattern: ['deputy-integration.cy.ts']
      }
    },
    env: await getEnv(environment)
  }
}

async function options() {
  if (argv.env) {
    switch (argv.env.toUpperCase()) {
      case 'LOCAL':
        localConfig = await runConfig('local')
        localConfig.config.e2e.excludeSpecPattern = [
          'learners-sso.cy.ts',
          'course-pagination-learners.cy.ts'
        ]
        return localConfig

      case 'STAGING':
        return await runConfig('staging')

      case 'PROD-SMOKE':
      case 'PRODUCTION-SMOKE':
        prodSmokeConfig = await runConfig('production')
        prodSmokeConfig.config.testFiles = ['login/*', 'registration/*']
        return prodSmokeConfig

      case 'PROD':
      case 'PRODUCTION':
        return await runConfig('production')

      case 'BRANCH':
        branchConfig = await runConfig('branch')
        branchConfig.config.e2e.excludeSpecPattern = ['learners-sso.cy.ts']
        return branchConfig

      default:
        return await runConfig('local')
    }
  } else {
    console.error(
      '\nYou did not specifiy the ENVIRONMENT.\nPlease provide the ENVIRONMENT using the --env agrument.\nEg: --env=local , --env=staging\n'
    )
    process.exit(1)
  }
}

;(async () => {
  const openOptions = await options()
  console.log('Opening with the following config :\n', openOptions)

  await cypress.open(openOptions).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
})()
