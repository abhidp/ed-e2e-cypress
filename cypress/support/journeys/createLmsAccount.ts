import { createEmail } from '../helper/common-util'
import { registerNewAccountFromHippo, completeTutorialFromHippo } from '../helper/api-helper'
import { getNameFromEmail } from '../helper/utils'

export const createLmsAccount = (
  email?: string,
  password?: string,
  type?: 'trial' | 'learner',
  preventRedirect?: boolean
) => {
  if (!email) {
    email = createEmail()
  }
  if (!password) {
    password = Cypress.env('COMMON_TEST_PASSWORD')
  }

  if (!type) {
    type = 'trial'
  }

  return registerNewAccountFromHippo(email, password, type).then(registerReponse => {
    const { redirect, token } = registerReponse.body
    if (!preventRedirect) {
      cy.visit(redirect)
      return completeTutorialFromHippo(token)
    }
  })
}

export const fillLmsSignUpFormAndRegister = (email: string, password: string) => {
  const firstName = getNameFromEmail(email).firstName
  const lastName = getNameFromEmail(email).lastName
  const accountInitial = firstName[0] + lastName[0]
  cy.getByName('phone').should('exist').and('be.visible')

  cy.getByName('email').clearAndType(email)
  cy.getByName('password').clearAndType(password)
  cy.getByName('firstName').clearAndType(firstName)
  cy.getByName('lastName').clearAndType(lastName)
  cy.getByName('phone').clearAndType(`+${Date.now()}`)

  cy.intercept('POST', '/register-service').as('register')
  cy.getByButtonText('Get started for FREE')
    .click()
    .wait('@register')
    .then(register => {
      expect(register.response.statusCode).to.equal(200)
    })

  cy.url().should('include', '/welcome')
  cy.contains('Almost done!').should('be.visible')
  cy.contains('Tell us a bit more about you and your company.').should('be.visible')

  cy.getByName('companyName').clearAndType(`${firstName} ${lastName} Pty Ltd`)

  cy.getByTestId('company-size').click()
  cy.contains('51-100').forceClick()

  cy.getByTestId('job-title').click()
  cy.contains('Student').forceClick()

  cy.getByTestId('region').click()
  cy.contains('Asia Pacific').forceClick()

  cy.contains('Search').forceClick().type('Agriculture{enter}')

  cy.intercept('GET', '/api/onboarding/checklist/main').as('onboardingChecklist')
  cy.getByButtonText('Get started').click().wait('@onboardingChecklist')
  cy.url().should('include', 'get-started')

  cy.get('.navbar-account-user').should('contain.text', accountInitial)
}
