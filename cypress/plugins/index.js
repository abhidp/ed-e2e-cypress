/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const MicrosoftSingleSignOn = require('./microsoftLogin').MicrosoftSingleSignOn
const DeputyConnect = require('./deputyConnect').deputyConnect

const util = require('util')
const exec = util.promisify(require('child_process').exec)

import _ from 'lodash'
import del from 'del'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

import chalk from 'chalk'
const log = console.log

module.exports = (on, config) => {
  const data = {}

  on('task', {
    setValue: object => {
      _.merge(data, object)
      return data
    },

    getValue: () => {
      return data || null
    },

    getSsoLink: MicrosoftSingleSignOn,
    deputyConnect: DeputyConnect,
    failed: require('cypress-failed-log/src/failed')()
  })

  on('before:browser:launch', (browser = {}, launchOptions) => {
    if (browser.family === 'chromium' && browser.name !== 'electron') {
      launchOptions.args.push('--auto-open-devtools-for-tabs')
    }
    return launchOptions
  })

  on('before:spec', (spec, results) => {
    /*  
        this shell script will remove junit xml reports from the previous cypress run/retries
        we should only keep the last retry-run for a specific file, otherwise junit report will
        contain multiple results for the same file (eg. tests which failed in the previous 2 atttempts
        and passed in the 3rd attempt, there will be 3 entries for this file in the report -> fail, fail, pass.
        In this case we should only keep the pass entry and delete the other 2 failed entries) 
     */
    exec(`grep -rlI "${spec.name}" * | xargs -I{} rm -v {} `)

    log('\n')
    log(chalk.keyword('orange')(`${'_'.repeat(40)}`))
    log(chalk.keyword('orange')(`Spec started at : ${dayjs().utc().format()}`))
  })

  on('after:spec', (spec, results) => {
    log(chalk.keyword('cyan')(`Spec ended at   : ${dayjs().utc().format()}`))
    log(chalk.keyword('cyan')(`${'_'.repeat(40)}\n`))

    // Only upload videos for specs with failing or retried tests
    if (results && results.video) {
      const failures = _.some(results.tests, test => {
        return _.some(test.attempts, { state: 'failed' })
      })
      if (!failures) {
        return del(results.video)
      }
    }
  })

  on('after:run', results => {
    let allFailures = []

    if (results.runs)
      if (results.runs.length > 0) {
        for (let i = 0; i < results.runs.length; i++) {
          for (let j = 0; j < results.runs[i].tests.length; j++) {
            if (results.runs[i].tests[j].state === 'failed') {
              allFailures.push(results.runs[i].spec.relative)
            }
          }
        }
      }

    if (allFailures.length) {
      log(chalk.red(`Failed Specs : -`))
      allFailures.forEach(failedSpec => {
        log(chalk.red(failedSpec))
      })
    }

    log(`\n==============================================`)
    log(chalk.keyword('orange').bold(`  Run started at :  ${results.startedTestsAt}`))
    log(chalk.keyword('cyan').bold(`  Run ended at   :  ${results.endedTestsAt}`))
    log(`==============================================\n`)
  })

  require('cypress-fail-fast/plugin')(on, config)
  return config
}
