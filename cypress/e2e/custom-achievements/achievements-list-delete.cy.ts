import { createEmail } from 'cypress/support/helper/common-util'
import defaultAchievements from 'cypress/fixtures/custom-achievements/default-achievements.json'
let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  engageMenuItem: '#engage-menu-item',
  achievementsMenuItem: '[href="/achievements"]',
  onboardingModal: 'custom-achievements-onboarding-modal',
  searchInput: "[data-testid='search-input-input']",
  achievementListRow: "[data-testid*='selectable-table-row-']",
  upgradeBanner: "[data-testid='custom-achievements-free-upgrade-banner']",
  deleteIcon: `[data-testid='achievement-row-delete-button']`
}

describe('Achievements list search', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'DELETE', url: '/api/custom-achievements/*' }).as('achievementsDelete')
  })
  describe('As an LMS Admin, on a Free Plan', () => {
    it('Can not delete custom achievements', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)

      cy.navigateTo('LMS', 'home')
      cy.url().should('include', 'home')

      cy.get(selectors.engageMenuItem)
        .click()
        .find(selectors.achievementsMenuItem)
        .click()
        .wait('@customAchievementsList')
      cy.url().should('include', '/achievements')
      cy.getByButtonText("Let's get started").click()
      cy.navigateTo('LMS', 'achievements')

      cy.get(selectors.achievementListRow).contains(selectors.deleteIcon).should('not.exist')
    })
  })
  describe('As an LMS Admin, on an Enterprise Plan', () => {
    it('Can delete default custom achievements in the list', () => {
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.url().should('include', 'achievements')

      cy.get(selectors.searchInput).type(defaultAchievements.Beginner)
      cy.get(selectors.achievementListRow).get(selectors.deleteIcon).click({ force: true })

      cy.contains('Are you sure you want to delete this Achievement?')
      cy.contains("This will delete this achievement's data for all Learners.")
      cy.getByButtonText('Delete Achievement').should('be.disabled')

      cy.getByPlaceHolderText('delete').type('delete')

      cy.getByButtonText('Delete Achievement')
        .should('be.enabled')
        .click()
        .wait('@achievementsDelete')
      cy.get(selectors.searchInput).clear()

      cy.contains(defaultAchievements.Beginner).should('not.exist')
    })
  })
})
