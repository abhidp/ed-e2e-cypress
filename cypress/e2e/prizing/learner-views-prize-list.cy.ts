/* eslint-disable cypress/no-unnecessary-waiting */
/* 
  - Create prizes in LMS
  - Login as Learner and view all upcoming prizes
*/

import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const prizeDrawTitle = 'ED-13706: Prize Draw'
const prizeName = 'ED-13706: Prize Voucher'

describe('Feature: Learner looses start after each game played', () => {
  describe('LMS Setups', () => {
    it('Create LMS Account, Prize Draw, Enable Leaderboards, Create Learner Account', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.updateAppSettings(adminEmail, password)

      cy.createPrizeDrawWithPrize(
        adminEmail,
        password,
        { name: prizeDrawTitle, gameType: 'chance' },
        prizeName
      )

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ]).setCookie('email', learnerEmail)
    })
  })

  describe('Learner Plays Game', () => {
    it('Learner plays game in Star Bar and loses one star', () => {
      cy.getCookie('email').then(email => {
        cy.loginToLearnersAppViaUI(email.value, password)
      })

      cy.contains('Star Bar').forceClick()
      cy.url().should('include', '#game')

      cy.get('[href="#upcoming-prizes"]')
        .should('contain.text', 'The next prize is')
        .and('contain.text', prizeName)
        .and('contain.text', 'See more prizes')

      cy.contains('See more prizes').forceClick()
      cy.url().should('include', '#upcoming-prizes')

      cy.getByTestId('view-head').should('contain.text', 'Upcoming Prizes')

      cy.contains(prizeName).should('exist')
    })
  })
})
