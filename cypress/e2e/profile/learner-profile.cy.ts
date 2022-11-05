import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

let adminEmail: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  profileTab: '[href="#profile"]',
  achievementsButton: '[href="#achievements"]',
  unearnedAchievementIcon: '[data-testid="unearned-achievement-icon"]',
  accountSettingsButton: '[href="#account-settings"]',
  starView: '#star-view'
}

xdescribe('As Learner, on Profile Page', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: 'api/custom-achievements/sync' }).as(
      'achievementsListFetched'
    )
    cy.intercept({ method: 'POST', url: '/api/Interactions/batch' }).as('batchInteractions')
  })
  it('Can view user details', () => {
    //create admin and learner account
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    learnerEmail = `edappt+learner+${adminEmail}`
    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])

    //login to UI and navigate to profile page
    cy.loginToLearnersAppViaUI(learnerEmail, password)
    cy.url().should('include', '#home')
    cy.get(selectors.profileTab).click().wait('@achievementsListFetched')
    cy.contains('My Profile').should('be.visible')

    const firstName = getNameFromEmail(learnerEmail).firstName
    const lastName = getNameFromEmail(learnerEmail).lastName
    cy.contains(`${firstName} ${lastName}`).should('be.visible')

    cy.get(selectors.starView).should('be.visible')
    cy.contains('EdApp v')
  })

  it('Can view achievements button if achievements available', () => {
    cy.get(selectors.achievementsButton).should('be.visible')
    cy.get(selectors.unearnedAchievementIcon).should('have.length.at.least', 4)
    cy.get(selectors.achievementsButton).click()
    cy.url().should('include', 'achievements')
    cy.getByTestId('menu-toggle').first().forceClick()
    cy.url().should('include', 'profile')
  })

  it('Can view account settings button button ', () => {
    //login to UI and navigate to profile page
    cy.get(selectors.accountSettingsButton).should('be.visible')
    cy.get(selectors.accountSettingsButton).click()
    cy.url().should('include', '#account-settings')
  })

  it('Can not view achievements page if no achievements available', () => {
    cy.upgradeToEnterprisePlan(adminEmail, password)
    cy.bulkDeleteAllCustomAchievement(adminEmail, password)

    //login to learners app
    cy.loginToLearnersAppViaUI(learnerEmail, password)
    cy.url().should('include', '#home')
    cy.get(selectors.profileTab).click().wait('@achievementsListFetched')
    cy.get(selectors.achievementsButton).should('not.exist')

    // Users should be redirected if they navigate to achievements page manually when no achievements available
    // cy.navigateTo('LEARNERS_APP', '#achievements')
    // cy.url().should('not.include', '#achevements')
  })

  it('Can sign out from profile page', () => {
    cy.getByButtonText('Sign out').click()
    cy.contains('Sign out')
    cy.contains('Are you sure you want to sign out?')
    cy.getByButtonText('Cancel').click()

    cy.contains('Are you sure you want to sign out?').should('not.exist')
    cy.contains('Sign out').click()
    cy.contains('Are you sure you want to sign out?')
    cy.getByButtonText('Yes, I’m sure').click().wait('@batchInteractions')
    cy.url().should('include', '#login')
  })
})
