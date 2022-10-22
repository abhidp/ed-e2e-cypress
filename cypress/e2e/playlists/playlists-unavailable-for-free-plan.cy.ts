import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const upgradeDescription =
  'To enable Playlists, upgrade your plan now to drive the success of your microlearning.'

describe('Feature: Prizing should not be available in free plan', () => {
  it('Validate upgrade message on free plan then upgrade to Growth plan', () => {
    email = createEmail()
    cy.createLmsAccount(email, password).navigateTo('LMS', 'playlists')

    cy.contains(upgradeDescription).should('be.visible')
    cy.contains('Explore Plans').should('have.attr', 'href', '/subscribe/select-plan')
  })

  it('Playlists should be available after upgrading to Growth plan', () => {
    cy.upgradePlanTo(email, password, 'growth').navigateTo('LMS', 'playlists')

    cy.contains('Use playlists to guide your users through a sequence of courses').should(
      'be.visible'
    )

    cy.contains('Create a playlist to get started').should('be.visible')
    cy.contains('Create a playlist').should('be.visible').click()
    cy.url().should('include', '/playlists/new')
  })
})
