// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import 'cypress-plugin-tab'
import 'cypress-fail-fast'
import 'cypress-failed-log'
import './commands'
import { ACCOUNT_COOKIE_NAME } from './helper/constants'

Cypress.Cookies.defaults({
  preserve: [
    'connect.sid', //WARNING: adding connect.sid here breaks other tests, use .preserveOnce instead,
    'token',
    'email',
    'password',
    'userGroupInviteCode',
    'userInviteCode',
    'userGroupID',
    ACCOUNT_COOKIE_NAME
  ]
})

// https://github.com/cypress-io/cypress/discussions/16536
Cypress.Server.defaults({
  ignore: xhr => {
    return Cypress.config().blockHosts.some(blockedHost =>
      Cypress.minimatch(new URL(xhr.url).host, blockedHost)
    )
  }
})

Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('maggie')) {
    cy.wait(10000)
    cy.reload()
    return false
  }
})
