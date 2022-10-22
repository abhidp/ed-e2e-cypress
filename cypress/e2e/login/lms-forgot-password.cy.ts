import { getEmailFromMailgun } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const oldPassword = `old-password-${Cypress.env('COMMON_TEST_PASSWORD')}`
const newPassword = `new-password-${Cypress.env('COMMON_TEST_PASSWORD')}`

describe('LMS Forgot Password', () => {
  it('Create LMS account with old password', () => {
    email = createEmail('@edapp.com')

    cy.createLmsAccount(email, oldPassword)
    cy.logOutLMS()
  })

  it('Click "Forgot your password?" -> redirects to Forgot Password page', () => {
    cy.navigateTo('LMS', 'login')
    cy.contains('Forgot your password?').forceClick()
    cy.url().should('include', 'forgot-password')

    cy.contains('Forgot your password?').should('be.visible')
    cy.contains(
      'Enter your email address and we will send you a link to reset your password.'
    ).should('be.visible')
  })

  it('Enter email, Reset password and wait for email', () => {
    cy.getByPlaceHolderText('Enter your email').type(email)

    cy.intercept('POST', '/forgot-password').as('forgotPassword')
    cy.getByButtonText('Reset my password')
      .click()
      .wait('@forgotPassword')
      .its('response.statusCode')
      .should('equal', 200)

    cy.get('.modal-body')
      .should('be.visible')
      .and('contain.text', 'Your request to reset your password has been sent!')
      .and(
        'contain.text',
        'If you are a registered user, you will receive an email shortly with instructions to reset your password.'
      )

    cy.getByClassNameLike('close btn-close').click()
    cy.get('.modal-body').should('not.be.visible')

    getEmailFromMailgun(email, `Here's your EdApp password reset link`).then(response => {
      expect(response.template.name).to.equal('ed-reset-password')
      const resetPasswordLink = response['user-variables'].resetLink
      cy.visit(resetPasswordLink)
    })

    cy.contains('Reset your password').should('be.visible')
    cy.contains('Enter a new password to access your account').should('be.visible')

    cy.getByPlaceHolderText('Please enter your new password').type(newPassword)
    cy.getByPlaceHolderText('Confirm your password').type(newPassword)

    cy.intercept('POST', '/api/users/reset-password').as('resetPassword')
    cy.intercept('POST', '/login').as('login')

    cy.getByButtonText('Reset and sign in').click().wait(['@resetPassword', '@login'])

    cy.url().should('include', '/get-started')
  })

  it('Logout and Login with New Password', () => {
    cy.logOutLMS()
    cy.loginLMS(email, newPassword)
    cy.url().should('include', 'get-started')
  })
})
