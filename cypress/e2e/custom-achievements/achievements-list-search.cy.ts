import { createEmail } from 'cypress/support/helper/common-util'
import defaultAchievements from 'cypress/fixtures/custom-achievements/default-achievements.json'
let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const achievementTitles = Object.values(defaultAchievements)

const selectors = {
  engageMenuItem: '#engage-menu-item',
  achievementsMenuItem: '[href="/achievements"]',
  onboardingModal: 'custom-achievements-onboarding-modal',
  searchInput: 'search-input-input',
  achievementListRow: "[data-testid*='selectable-table-row-']",
  upgradeBanner: '[data-testid="custom-achievements-free-upgrade-banner"]'
}

describe('Achievements list search', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
  })
  describe('As an LMS Admin, on a Free Plan', () => {
    it('Can access Achievements page from the Engage menu', () => {
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
    })

    it('Contains the onboarding modal for a first time user', () => {
      cy.getByTestId(selectors.onboardingModal).should('be.visible')
      cy.getByButtonText("Let's get started").click()
      cy.url().should('include', 'subscribe/select-plan')
    })

    it('Contains all default achievements', () => {
      cy.navigateTo('LMS', 'achievements')
      achievementTitles.forEach(title => {
        cy.contains(title)
      })
    })

    it('Can search for achievements', () => {
      // We do not need to do an extensive search as we are already doing so above
      achievementTitles.slice(0, 4).forEach(title => {
        cy.getByTestId(selectors.searchInput).clear().type(title)
        cy.get(selectors.achievementListRow)
          .should('have.length.at.least', 1)
          .each(row => cy.wrap(row).contains(title, { matchCase: false }))
      })
    })

    it('Contains the upgrade banner', () => {
      cy.get(selectors.upgradeBanner)
        .should('be.visible')
        .getByButtonText('Upgrade to EdApp Pro')
        .click()
      cy.url().should('include', 'subscribe/select-plan')
    })
  })

  describe('As an LMS Admin, on an Enterprise Plan', () => {
    it('Can access Achievements page from the Engage menu', () => {
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.navigateTo('LMS', 'home')
      cy.url().should('include', 'home')

      cy.get(selectors.engageMenuItem)
        .click()
        .find(selectors.achievementsMenuItem)
        .click()
        .wait('@customAchievementsList')
      cy.url().should('include', '/achievements')
    })

    it('Contains all default achievements', () => {
      achievementTitles.forEach(title => {
        cy.contains(title)
      })
    })

    it('Can search for default achievements', () => {
      achievementTitles.forEach(title => {
        cy.getByTestId(selectors.searchInput).clear().type(title)
        cy.get(selectors.achievementListRow)
          .should('have.length.at.least', 1)
          .each(row => cy.wrap(row).contains(title, { matchCase: false }))
      })
    })
  })
})
