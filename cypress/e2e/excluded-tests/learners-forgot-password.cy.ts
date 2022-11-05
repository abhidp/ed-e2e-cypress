// Excluded from all STAGING and PROD runs
// https://ed-app.atlassian.net/browse/ED-27218

/*
    Reason for excluding forgot-password spec:
    "message": "4.2.1 The user you are trying to contact is receiving mail at a rate that
                prevents additional messages from being delivered. Please resend your
                message at a later time. If the user is able to receive mail at that
                time, your message will be delivered. For more information, please
                visit https://support.google.com/mail/?p=ReceivingRate"
*/

import { getEmailFromMailgun } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const incorrectEmail = 'incorrectEmail@incorrectDomain.com'

const oldPassword = `old-password-${Cypress.env('COMMON_TEST_PASSWORD')}`
const newPassword = `new-password-${Cypress.env('COMMON_TEST_PASSWORD')}`

describe('Feature: Forgot Password', () => {
  describe('Providing incorrect/non-existing email should not send the password reset link', () => {
    it('Navigate to Learners App, provide incorrect email click on Forgot password link', () => {
      cy.navigateTo('LEARNERS_APP')
      cy.url().should('include', '#login')

      cy.contains('Sign in').click()
      cy.getByPlaceHolderText('Enter your email or username').type(incorrectEmail)
      cy.get('form').submit()

      cy.contains('Forgot your password?').click()
      cy.contains('Sorry your username/email is incorrect. Please try again').should('be.visible')
    })
  })

  describe('Provide correct/existing email and request forgot password link', () => {
    it('Navigate to Learners App and click on Forgot password link', () => {
      email = createEmail('@edapp.com')
      cy.createLearnerViaApi(email, oldPassword)

      cy.navigateTo('LEARNERS_APP')
      cy.url().should('include', '#login')

      cy.contains('Sign in').click()
      cy.getByPlaceHolderText('Enter your email or username').type(email)
      cy.get('form').submit()

      cy.intercept('POST', 'api/v2/email/forgot-password').as('forgotPasswordRequest')
      cy.contains('Forgot your password?').click().wait('@forgotPasswordRequest')
    })

    it('Should show forgot password screen', () => {
      cy.getByClassNameLike('ForgotPasswordScreen')
        .should('contain.text', 'Help is on the way!')
        .and('contain.text', `We have sent an email to${email}`)
        .and('contain.text', `You may need to check your junk email or spam folder.`)
        .and(
          'contain.text',
          `Please check your email for instructions on how to reset your password.`
        )

      cy.getByClassNameLike('ResetPasswordLink')
        .should('be.visible')
        .and('contain.text', `Didn't get it?`)
        .and('contain.text', `Resend email`)
    })

    it('Get Reset Password link from Mailgun and change password', () => {
      getEmailFromMailgun(email, `Here's your EdApp password reset link`).then(response => {
        expect(response.template.name).to.equal('ed-reset-password')

        const resetPasswordLink = response['user-variables'].resetLink
        cy.visit(resetPasswordLink)
      })

      cy.getByPlaceHolderText('Enter the new password').type(newPassword)
      cy.getByPlaceHolderText('Confirm the new password').type(newPassword)

      cy.intercept('POST', '/api/users/reset-password').as('resetPassword')
      cy.intercept('POST', '/api/login/learner').as('login')

      cy.getByButtonText('Reset Password').click().wait(['@resetPassword', '@login'])

      cy.intercept('POST', '/api/Interactions/batch', req => {
        const visitInteraction = req.body.find((item: any) => item.type === 'visit')
        expect(visitInteraction).to.exist
      }).as('interaction')

      cy.url().should('include', '#home')
      cy.wait('@interaction')
      cy.url().should('include', '#home')

      cy.contains('My Profile').click().url().should('include', '#profile')
      cy.contains(email).should('be.visible')
    })

    it('Confirm Login to Learners with new password', () => {
      cy.loginToLearnersAppViaUI(email, newPassword)

      cy.contains('My Profile').click().url().should('include', '#profile')
      cy.contains(email).should('be.visible')
    })
  })
})
