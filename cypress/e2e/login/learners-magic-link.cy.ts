/* 
  This spec doesn't run on LOCAL because of different domains localhost:3333(learnersApp) and localhost:8085 (from magiclink)
  Running against STAGING works fine
  
  Scenario: 
  - Request SignIn magiclink from LearnersApp 
  - Poll API requests to Mailgun until magiclink is retrieved
  - Use magiclink to signin
*/

import { getEmailFromMailgun } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Login via Magic Link', () => {
  describe('Request Magic Link on Learners App', () => {
    beforeEach('Define Network Calls', () => {
      cy.intercept('POST', '/api/email/magic-link').as('magicLinkSent')
    })

    it('Create Learner Account via API', () => {
      adminEmail = createEmail('@edapp.com')
      learnerEmail = `qa+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail })
    })

    it('Should NOT send magic link for invalid emails/usernames', () => {
      cy.navigateTo('LEARNERS_APP', '', true).url().should('include', '#login')

      cy.getByPlaceHolderText('Enter your email or username').clear().type('incorrect@email.com')
      cy.get('form').submit()
      cy.contains('Email me a magic link').should('be.visible').click()
      cy.contains('Incorrect email/username, please try again').should('be.visible')
    })

    it('Requesting Magic link without changing password and first time login should not be allowed', () => {
      cy.navigateTo('LEARNERS_APP').url().should('include', '#login')

      cy.task('getValue').then(value => {
        const userEmail = value.learnerEmail

        cy.getByPlaceHolderText('Enter your email or username').clear().type(userEmail)
        cy.get('form').submit()

        cy.contains('Log in with a magic link, password free!').should('be.visible')
        cy.contains('Email me a magic link').should('be.visible').click().wait('@magicLinkSent')

        cy.title().should('include', 'EdApp')
        cy.contains(`To log in, use the magic link we sent to`).should('be.visible')

        cy.url().should('include', `/#magic-link?email=${userEmail}`)
      })
    })

    // uncaught exception : Cannot read property 'items' of undefined - working with devs to fix
    xit('Learner changes password on first time login, logs out and requests magic link', () => {
      cy.getCookie('email').then(email => {
        const userEmail = email.value
        cy.loginToLearnersAppViaUI(userEmail, password)
        cy.logOutLearner()

        cy.navigateTo('LEARNERS_APP').url().should('include', '#login')

        cy.getByPlaceHolderText('Enter your email or username').clear().type(userEmail)
        cy.get('form').submit()

        cy.contains('Log in with a magic link, password free!').should('be.visible')
        cy.contains('Email me a magic link').should('be.visible').click().wait('@magicLinkSent')

        cy.title().should('include', 'EdApp')
        cy.contains('Check your email').should('be.visible')
        cy.contains(`To log in, use the magic link we sent to${userEmail}`).should('be.visible')

        cy.url().should('include', `/#magic-link?email=${userEmail}`)
      })
    })
  })

  xdescribe('Retreive Magic and Sign In', () => {
    before(() => {
      cy.window().then(win => {
        win.sessionStorage.clear()
      })
    })

    it('Get Magic link from Mailgun, Sign In using magic and verify correct user is logged in', () => {
      const subject = `Here's your EdApp magic link`

      cy.getCookie('email').then(email => {
        getEmailFromMailgun(email.value, subject).then(response => {
          cy.visit(response['user-variables'].magicLink).url().should('include', '#home')
          cy.navigateTo('LEARNERS_APP', '#profile').url().should('include', '#profile')

          const firstName = getNameFromEmail(email.value).firstName
          const lastName = getNameFromEmail(email.value).lastName
          cy.contains(`${firstName} ${lastName}`).should('be.visible')
        })
      })

      cy.logOutLearner()
    })
  })
})
