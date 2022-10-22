/* eslint-disable cypress/no-unnecessary-waiting */
/* 
 - Create Account in LMS
 - App settings - enable stars, daily login reward etc
 - Create Prize Draw, Prize and add prize to prize draw via API
 - Login as Learner and play game
 - Validate star count is reduced by after game played
*/

import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const prizeDrawTitle = 'ED-13698: Stars deducted after each game played by Learner'
const prizeName = 'ED-13698: Prize'

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

      cy.enableLeaderboards(adminEmail, password)

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ]).setCookie('email', learnerEmail)
    })
  })

  describe('Learner Plays Game', () => {
    it('Learner plays game in Star Bar and loses one star', () => {
      let initialStarCount = 0
      cy.getCookie('email').then(email => {
        cy.loginToLearnersAppViaUI(email.value, password)
      })

      cy.contains('Star Bar').forceClick()

      cy.contains(prizeName).should('be.visible')

      cy.intercept('POST', '/api/lottery/spin-to-win').as('newStarBalance')

      cy.getByTestId('star-balance-view-token-count').then($text => {
        initialStarCount = $text.get(0).text()
      })

      cy.get('#play-btn')
        .click()
        .wait('@newStarBalance')
        .then(res => {
          expect(res.response.statusCode).to.eq(200)
          expect(res.response.body.numberOfStarsLeft).to.eq(initialStarCount - 1)
        })
    })
  })
})
