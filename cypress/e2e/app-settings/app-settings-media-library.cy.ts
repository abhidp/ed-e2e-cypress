import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const companyLogo = 'courses/courseThumbnail.jpg'

describe('Feature: App Settings page', () => {
  const gotoAppSettings = () => {
    cy.getByTestId('userSettingsDropdown').click({ force: true })
    cy.get('a').contains('App Settings').first().click()
    cy.url().should('include', 'app-settings')
  }

  it('Create account and navigate to LMS', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)

    cy.navigateTo('LMS')
  })

  it('Scenario: Enable Media Library', () => {
    gotoAppSettings()
    cy.intercept('GET', 'api/accounts/app-settings/content').as('getContent')

    cy.navigateTo('LMS', '/app-settings#panel-content').wait('@getContent')
    cy.url().should('include', 'panel-content')

    cy.contains('Media Library').should('be.visible')
    cy.contains('Bulk upload and organise your files.').should('be.visible')

    cy.getByButtonText('Access media library').should('be.visible').forceClick()

    cy.intercept('POST', '/api/documents/bulk').as('logoUploaded')
    cy.getByTestId('uploadImageButton').attachFile(companyLogo).wait('@logoUploaded')
  })
})
