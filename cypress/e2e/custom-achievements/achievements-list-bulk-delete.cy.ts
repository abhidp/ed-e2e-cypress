import { createEmail } from 'cypress/support/helper/common-util'
let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  engageMenuItem: '#engage-menu-item',
  achievementsMenuItem: '[href="/achievements"]',
  onboardingModal: 'custom-achievements-onboarding-modal',
  searchInput: 'search-input-input',
  achievementListRow: "[data-testid*='selectable-table-row-']",
  achievementListRowCheckbox: "[data-testid*='-checkbox']",
  upgradeBanner: '[data-testid="custom-achievements-free-upgrade-banner"]',
  bulkSelectCheckbox: '[data-testid="selectable-table-column-checkbox"]',
  bulkDeleteIcon: '[data-testid="selectable-table-column-bulk-delete"]'
}

describe('Achievements list bulk delete', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'DELETE', url: '/api/custom-achievements' }).as('achievementsBulkDelete')
  })
  describe('As an LMS Admin, on a free plan', () => {
    it('Navigates to the achievements page', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)

      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.url().should('include', 'achievements')
      cy.getByButtonText("Let's get started").click()
      cy.navigateTo('LMS', 'achievements')
    })

    it('Cannot select rows because the checkbox do not exist', () => {
      cy.contains(selectors.achievementListRowCheckbox).should('not.exist')
      cy.contains(selectors.bulkSelectCheckbox).should('not.exist')
    })
  })
  describe('As an LMS Admin, on an enterprise plan', () => {
    it('Navigates to the achievements page', () => {
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.url().should('include', 'achievements')
    })

    it('Can select all individually', () => {
      cy.get(selectors.achievementListRow).each(row => {
        cy.wrap(row).within(() => {
          cy.get(selectors.achievementListRowCheckbox).click()
          cy.getByTestId('checkbox-visible').within(() => cy.get('svg').should('be.visible'))
        })
      })
    })

    it('Should unselect the rows by clicking the bulk select checkbox', () => {
      cy.get(selectors.bulkSelectCheckbox).click()
      cy.get(selectors.achievementListRow).each(row =>
        cy.wrap(row).getByTestId('checkbox-visible').contains('svg').should('not.exist')
      )
    })

    it('Should select the rows by clicking the bulk select checkbox', () => {
      cy.get(selectors.bulkSelectCheckbox).click()
      cy.get(selectors.achievementListRow).each(row => {
        cy.wrap(row).within(() => {
          cy.getByTestId('checkbox-visible').within(() => cy.get('svg').should('be.visible'))
        })
      })
    })

    it('Should trigger bulk delete of selected rows when the bulk delete icon is clicked', () => {
      cy.get(selectors.bulkDeleteIcon).click()
      cy.contains('Are you sure you want to delete 34 Achievements?')
      cy.contains("This will delete the achievement's data for all Learners.")
      cy.getByButtonText('Delete Achievements').should('be.disabled')

      cy.getByPlaceHolderText('delete').type('delete')
      cy.getByButtonText('Delete Achievements')
        .should('be.enabled')
        .click()
        .wait('@achievementsBulkDelete')

      cy.get(selectors.achievementListRow).should('have.length', 0)
    })
  })
})
