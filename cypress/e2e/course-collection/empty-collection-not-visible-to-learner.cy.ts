/* eslint-disable mocha/no-hooks-for-single-case */
//Empty Course collection should not be visible to the Learner

import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseCollectionTitle = 'ED-13713: Empty Course Collection not visible to Learner'

let courseCollectionId: string

describe('Feature: Learner should not be able to view empty course collection', () => {
  describe('As a Admin', () => {
    it('Create an Empty Course Collection in LMS', () => {
      email = createEmail()
      cy.createLmsAccount(email, password)
      cy.createCourseCollection(email, password, courseCollectionTitle).then(id => {
        return (courseCollectionId = `${id}`)
      })
    })

    it('Validate Course collection has 0 courses in LMS', () => {
      cy.navigateTo('LMS', '/courseware')
      cy.url().should('include', '/courseware')

      cy.get('[data-testid*="content-card-contents"]')
        .should('be.visible')
        .and('contain.text', courseCollectionTitle)

      cy.createLearnerAccount(email, password, `edappt+learner+${email}`, password, ['app-user'])
      cy.setCookie('email', email)
    })
  })

  describe('As a Learner', () => {
    it('Login as Learner and validate Course Collection is not visible', () => {
      cy.getCookie('email').then(email => {
        cy.loginToLearnersAppViaUI(`edappt+learner+${email.value}`, password)
      })

      cy.contains('You don’t have any active courses at the moment.').should('be.visible')
      cy.contains('That’s no fun!').should('be.visible')
      cy.getByButtonText('Retry').should('be.visible')
    })
  })
})
