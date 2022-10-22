import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const upgradeTitle = 'Stars & Automated Prizing Delivery is available on the Growth plan'
const upgradeDescription =
  'To enable Stars & Prizing, upgrade your plan now and engage your learners by using real and instant rewards.'

describe('Feature: Prizing should not be available in free plan', () => {
  it('Validate upgrade message on free plan then upgrade to Growth plan', () => {
    email = createEmail()
    cy.createLmsAccount(email, password).navigateTo('LMS', 'draws')

    cy.contains(upgradeTitle).should('be.visible')
    cy.contains(upgradeDescription).should('be.visible')
    cy.contains('Explore Plans').should('have.attr', 'href', '/subscribe/select-plan')
    cy.upgradePlanTo(email, password, 'growth')
  })

  it('Prizing should be now available for Growth plan', () => {
    cy.navigateTo('LMS', 'draws')
    cy.contains('This account doesn’t have any prize draws yet.').should('be.visible')
    cy.contains('Create a draw').should('be.visible').click()
    cy.url().should('include', '/draw/new')
  })
})
