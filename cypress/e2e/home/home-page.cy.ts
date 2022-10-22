import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Home', () => {
  it('Should create an LMS free account and navigate to get-started page', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)

    cy.navigateTo('LMS', '/home')
    cy.contains('Dashboard')

    cy.get('#navbar-logo').click()
    cy.url().should('include', '/get-started') // regirects to /get-started
  })

  it('Should navigate to users page', () => {
    cy.navigateTo('LMS', '/users')
    cy.url().should('include', '/users')
  })

  it('Should upgrade to Enterprise Plan and navigate to Dashboard page', () => {
    cy.upgradeToEnterprisePlan(adminEmail, password)

    cy.navigateTo('LMS', `/home`)
    cy.contains('Dashboard')

    cy.get('#navbar-logo').click()
    cy.contains('Dashboard')
  })
})
