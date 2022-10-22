/* 
  - Admin creates Prizes
  - Learner play game and wins
  - Learner claims prize
  - Admin verifies prize has been claimed

*/

import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

let email: string
let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const prizeDrawTitle = 'ED-13709: Prize Draw'
const prizeName = 'ED-13709: Prize Voucher'

let firstName: string
let lastName: string

const thirtyCharsAdvice = 'advice '.repeat(10)

describe('Feature: Learner views winner list', () => {
  beforeEach('Setup Network call intercepts', () => {
    cy.intercept('POST', '/api/lottery/spin-to-win').as('spinToWin')
    cy.intercept('GET', '/api/users/sync').as('sync')
    cy.intercept('POST', '/api/lottery/claim-prize').as('claimPrize')
    cy.intercept('GET', '/api/Interactions/batch').as('batch')
    cy.intercept('GET', '/api/stars').as('stars')
  })

  it('Setup Accounts', () => {
    email = createEmail()
    adminEmail = `edappt+admin+${email}`
    learnerEmail = `edappt+learner+${email}`

    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)
    cy.updateAppSettings(adminEmail, password)

    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, [
      'app-user',
      'prizing-user'
    ]).setCookie('email', learnerEmail)

    cy.createPrizeDrawWithPrize(
      adminEmail,
      password,
      { name: prizeDrawTitle, gameType: 'chance' },
      prizeName
    ).then(response => {
      cy.task('setValue', { drawId: response.body.drawId })
    })
  })

  it('Login as Learner and play game', () => {
    cy.getCookie('email').then(email => {
      cy.loginToLearnersAppViaUI(email.value, password)
    })

    cy.contains('Star Bar').forceClick()
    cy.url().should('include', '#game')
    cy.get('#game-wrapper')
      .should('contain.text', 'Get all the images to match')
      .and('contain.text', `and win today’s prize!`)

    cy.get('#play-btn').forceClick().wait(['@spinToWin', '@sync', '@stars'])

    cy.url().should('include', '#claim')
    cy.reload()
    cy.getByTestId('block').should('contain.text', 'Claim Your Prize')
    cy.get('form').should('be.visible')
    cy.getByButtonText('Claim your prize').should('be.disabled')

    cy.contains('Claim your prize later').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and(
        'contain.text',
        'You can claim your prize later by tapping on the prize icon in the Star Bar.'
      )

    cy.contains('Claim my prize later').forceClick()

    cy.url().should('include', '#game').reload()
    cy.contains('Don’t forget your prize.').should('be.visible')
    cy.contains('Claim it now!').forceClick()
    cy.url().should('include', '#claim')

    cy.getCookie('email').then(email => {
      cy.getByName('email').should('have.attr', 'value', email.value)

      firstName = getNameFromEmail(email.value).firstName
      lastName = getNameFromEmail(email.value).lastName

      cy.getByPlaceHolderText('Enter your first name').type(firstName)
      cy.getByPlaceHolderText('Enter your last name').type(lastName)

      cy.getByPlaceHolderText(
        'What’s your strategy? Add a little advice for your colleagues to claim your prize...'
      ).type(thirtyCharsAdvice)

      cy.contains('Great!').should('be.visible')
      cy.contains(`Thanks for your advice, ${firstName}`)

      cy.getByButtonText('Claim your prize').should('be.enabled').click().wait('@claimPrize')

      cy.get('#congratulations-view').should('be.visible')
      cy.url().should('include', '#congratulations')

      cy.getByButtonText('Continue').click()
      cy.url().should('include', '#home')

      cy.navigateTo('LEARNERS_APP', '#game').reload()

      cy.get('[href="#past-winners"]')
        .should('contain.text', `${firstName} won`)
        .and('contain.text', prizeName)

      cy.contains('See more winners').forceClick()
      cy.url().should('include', '#past-winners')

      cy.getByTestId('view-head').should('contain.text', 'Past Winners')
      cy.getByClassNameLike('winner-card').should('contain.text', `${firstName}won ${prizeName}`)

      cy.getByTestId('menu-toggle').first().forceClick()
      cy.url().should('include', '#game')
      cy.getByTestId('view-head').should('contain.text', 'Star Bar')
    })
  })

  it('Check Prizes claimed in LMS as Admin', () => {
    cy.task('getValue').then((value: any) => {
      cy.navigateTo('LMS', `draw/${value.drawId}`)
      cy.get('[href="#panel-winners"]').forceClick()

      cy.getCookie('email').then(email => {
        firstName = getNameFromEmail(email.value).firstName
        lastName = getNameFromEmail(email.value).lastName

        cy.get('#panel-winners')
          .should('contain.text', prizeName)
          .and('contain.text', `${firstName} ${lastName}`)
          .and('contain.text', email.value)
          .and('contain.text', thirtyCharsAdvice)
      })
    })
  })
})
