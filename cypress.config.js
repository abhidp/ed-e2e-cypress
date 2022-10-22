// import { defineConfig } from 'cypress'
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  defaultCommandTimeout: 60000,
  pageLoadTimeout: 60000,
  requestTimeout: 30000,
  taskTimeout: 240000,
  watchForFileChanges: false,
  viewportWidth: 1280,
  viewportHeight: 1024,
  chromeWebSecurity: false,
  experimentalFetchPolyfill: true,
  screenshotOnRunFailure: true,
  screenshotsFolder: 'cypress/screenshots',
  trashAssetsBeforeRuns: true,
  record: false,
  parallel: false,
  headless: true,
  headed: false,
  retries: {
    runMode: 2,
    openMode: 0
  },
  blockHosts: [
    '*lftracker.leadfeeder.com',
    '*fast.appcues.com',
    '*segment.com',
    '*api.segment.io',
    '*hsappstatic.net',
    '*hs-scripts.com',
    '*hubspot.com',
    '*hs-banner.com',
    '*usemessages.com',
    '*fullstory.com',
    '*newrelic.com',
    '*nr-data.net',
    '*datadoghq.com',
    '*sentry.io',
    '*browser-intake-datadoghq.com'
  ],
  env: {
    FAIL_FAST_STRATEGY: 'spec',
    FAIL_FAST_ENABLED: true
  },
  e2e: {
    setupNodeEvents(on, config) {
      require('./cypress/plugins/index.js')(on, config)
      return on, config
    },
    baseUrl: 'https://staging-cms.edapp.com/',
    excludeSpecPattern: '*.experiment.cy.ts'
  }
})
