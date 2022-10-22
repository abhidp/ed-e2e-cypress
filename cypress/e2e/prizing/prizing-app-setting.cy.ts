import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  enableStarsCheckbox: '[name="enableStars"]',
  starCountBox: '[name="appOpenRewardAmount"]',
  starBarGameOptions: '.star-bar-options',
  termsConditionsCheckbox: '[name="enableCompliance"]',
  termsConditionsText: '[name="complianceText"]',

  enableStarBarCheckbox: '[name="enableStarBar"]',
  starAnimationGIF: `img[src="video/star-face-anim.gif"]`,
  starBarMenu: '[href="#game"]',
  playButton: '#play-btn',
  spinToWinGame: '#spin-to-win',

  starBarGameRadioButton: (text: string) => `[data-testid="${text}.png"]`,
  button: (text: string) => `[data-testid=button]:contains("${text}")`
}

let email: string
let adminUser: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const noOfStars = 13

xdescribe('Feature: App Settings for Stars & Prizing', () => {
  describe('LMS Admin sets up Prizing', () => {
    it('Setup: Create LMS Admin and Learner user', () => {
      email = createEmail()
      adminUser = `edappt+admin+${email}`
      learnerEmail = `edappt+learner+${email}`

      cy.setCookie('email', learnerEmail)
      cy.createLmsAccount(adminUser, password)

      cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])

      cy.enableLeaderboards(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)

      cy.navigateTo('LMS', 'app-settings#panel-prizing')
        .url()
        .should('include', 'app-settings#panel-prizing')
    })

    it(`LMS Admin enables prizing and ${noOfStars} stars in App Settings`, () => {
      cy.intercept('GET', '/app-settings').as('appSettingsSaved')

      cy.get(selectors.starBarGameOptions)
        .should('contain', 'Spin To Win')
        .and('contain', 'Gift Grab')
        .and('contain', 'Lucky Dip')
        .and('contain', 'Star Bids')

      cy.get(selectors.enableStarsCheckbox).should('be.checked')
      cy.get(selectors.starCountBox).clear().type(`${noOfStars}`).blur().wait('@appSettingsSaved')

      cy.get(selectors.enableStarBarCheckbox).should('be.checked')
      cy.get(selectors.starBarGameRadioButton('spin-to-win'))
        .check({ force: true })
        .wait('@appSettingsSaved')

      cy.get(selectors.starBarGameRadioButton('spin-to-win')).should('be.checked')

      cy.get(selectors.starBarGameRadioButton('reveal')).should('not.be.checked')
      cy.get(selectors.starBarGameRadioButton('auction')).should('not.be.checked')
      cy.get(selectors.starBarGameRadioButton('lucky-dip')).should('not.be.checked')

      cy.get(selectors.termsConditionsCheckbox).check({ force: true }).wait('@appSettingsSaved')
      cy.get(selectors.termsConditionsCheckbox).should('be.checked')

      cy.get(selectors.termsConditionsText)
        .should('contain.text', 'I agree to the Terms and Conditions')
        .clear()
        .type('This is my custom Terms and Conditions{enter}')
        .wait('@appSettingsSaved')

      cy.logOutLMS()
    })
  })

  describe('Learner Signs In and plays Game', () => {
    it(`Learner sees ${noOfStars} Stars upon Login and on Menu bar`, () => {
      cy.getCookie('email').then(email => {
        cy.loginToLearnersAppViaUI(email.value, password)
      })

      cy.getByTestId('star-balance-view-token-count').then($el => {
        const starBalance = parseInt($el[0].text())
        expect(starBalance).to.be.at.least(noOfStars)
      })
    })

    it('Star Bar Game page should show Spin to Win game', () => {
      cy.getByTestId('app-nav').get(selectors.starBarMenu).should('be.visible').forceClick()

      cy.contains(`Get all the images to match`).should('be.visible')
      cy.get(selectors.spinToWinGame).should('be.visible')
    })

    it('Learner plays the game and should not win', () => {
      cy.get(selectors.playButton).should('be.visible').click()

      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', `Sorry!`)
        .and('contain.text', `Unfortunately, the Star Bar isn’t available at the moment,`)
        .and('contain.text', `(You probably won’t win, though.)`)

      cy.get(selectors.button('OK')).click()
      cy.getByTestId('dialog').should('not.exist')
    })
  })
})
