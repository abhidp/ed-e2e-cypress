import { createEmail } from 'cypress/support/helper/common-util'
import { registerAccountHasPreviewedInTheApp } from 'cypress/support/helper/api-helper'

let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-17816-Course'

const selectors = {
  tooltip: 'preview-course-tooltip'
}

describe('Course Preview page - QR code "Preview in the app" 🈁 ', () => {
  it('Create LMS Admin Account with 1 published Course', () => {
    adminEmail = createEmail()

    cy.createLmsAccount(adminEmail, password)

    cy.createCourse(adminEmail, password, courseTitle, true)
  })

  describe('As LMS admin check Course Preview page', () => {
    it('Should go to Courses page and check QR code "Preview in the app" existence', () => {
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Preview')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()
      // verify QR code existence
      cy.getByTestId(selectors.tooltip).should('exist').and('be.visible')
      // cross QR code
      cy.getByTestId('preview-course-tooltip-cross-icon').click()
      cy.getByTestId('preview-course-tooltip').should('not.exist')
    })

    it('Should update onboarding Checklist "Preview On App" and check that QR code "Preview in the app" disappeared', () => {
      registerAccountHasPreviewedInTheApp(adminEmail, password).then(() => {
        cy.navigateTo('LMS', '/courseware')
        cy.getByTestIdLike('content-card-contents')
          .first()
          .getByButtonText('Preview')
          .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
          .click()
        // verify QR code absence
        cy.getByTestId(selectors.tooltip).should('not.exist')
      })
    })
  })
})
