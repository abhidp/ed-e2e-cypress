import { createEmail, learnersHomePageRequests } from 'cypress/support/helper/common-util'

let email: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  leaderboardMenuItem: '[href="/leaderboards"]',
  leaderboardTitleInput: '[placeholder="Leaderboard Title"]',
  selectOption: (text: string) => `[data-testid*='selectable-list-'] li:contains("${text}")`,
  checkbox: (text: string) => `[data-testid=checkbox-label]:contains("${text}")`,
  radio: (text: string) => `[data-testid=radio-label]:contains("${text}")`
}

describe('Feature: Leaderboard Paid', () => {
  describe('Scenario: Create, View, Edit, Delete Leaderboards', () => {
    it('LMS: Create Individual Leaderboard with Learner Access, All Users and Save', () => {
      email = createEmail()
      learnerEmail = `edappt+learner+${email}`
      cy.setCookie('email', email)
      cy.setCookie('password', password)
      cy.createLmsAccount(email, password)

      const userRoles = ['app-user', 'prizing-user']
      cy.createLearnerAccount(email, password, learnerEmail, password, userRoles)

      cy.upgradeToEnterprisePlan(email, password)
      cy.enableLeaderboards(email, password)

      cy.navigateTo('LMS')
      cy.url().should('include', 'home')

      cy.get('#engage-menu-item').click().find(selectors.leaderboardMenuItem).click()
      cy.url().should('include', '/leaderboards')

      cy.getByButtonText('Create a leaderboard').first().click()
      cy.url().should('include', '/leaderboard')

      cy.get(selectors.leaderboardTitleInput).type('Individual Leaderboard')
      cy.get(selectors.selectOption('All users')).click()

      cy.intercept('POST', '/api/leaderBoard/definition').as('saveRequest')
      cy.getByButtonText('Save').click({ force: true })
      cy.wait('@saveRequest')

      cy.navigateTo('LMS', 'leaderboards')
      cy.getByTestIdLike('table-row').find('td').should('contain.text', 'Individual Leaderboard')
    })

    it('LMS: Create Group Leaderboards', () => {
      cy.navigateTo('LMS', 'leaderboards').url().should('include', 'leaderboards')
      cy.createUserGroup(email, password, 'User Group Collection', 'groups')
      cy.getByButtonText('Create a leaderboard').first().click()
      cy.url().should('include', '/leaderboard')

      cy.get(selectors.leaderboardTitleInput).type('Group Leaderboard')
      cy.get(selectors.checkbox('Learner Access')).click()
      cy.get(selectors.radio('Group Leaderboard')).click()
      cy.get(selectors.selectOption('User Group Collection')).click()

      cy.intercept('POST', '/api/leaderBoard/definition').as('saveRequest')
      cy.getByButtonText('Save').click({ force: true })
      cy.wait('@saveRequest')
    })
  })
})

describe('Learners App: Leaderboard is available for learners', () => {
  it('Login to Learners App and check Leaderboard', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.getByTestId('app-nav').find('li').contains('Leaderboard').click({ force: true })
    cy.url().should('include', '#leaderboard')

    cy.getByTestIdLike('leaderboard-item').first().click()
    cy.getByTestId('view-head').should('contain.text', 'Individual Leaderboard')
  })
})
