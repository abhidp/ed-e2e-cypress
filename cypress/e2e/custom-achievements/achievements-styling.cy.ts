import { createEmail } from 'cypress/support/helper/common-util'
let adminEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const achievementTitle = 'ED-16355: Custom Achievement Styling'
const selectors = {
  selectContainer: "[class*='ed-select__value-container']",
  selectOptions: '[class*="ed-select__menu"]',
  previewContainer: '[data-testid="custom-achievement-preview"]'
}

function select(dropdownText: string, optionText: string) {
  cy.get(selectors.selectContainer).contains(dropdownText).click()
  cy.get(selectors.selectOptions)
    .contains(optionText)
    .then(option => {
      cy.wrap(option).contains(optionText)
      cy.wrap(option).click()
    })
}

describe('Feature: Custom Achievements Styling', () => {
  describe('As LMS admin, on a Free Plan', () => {
    it('Can not navigate to the create achievement styling tab manually', () => {
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.navigateTo('LMS', 'achievements/new#styling')
      cy.url().should('include', '/achievements')
    })
  })

  describe('As LMS admin, on Enterprise Plan', () => {
    it('Can navigate to the create achievement recipe tab', () => {
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.navigateTo('LMS', 'achievements/new#styling')
      cy.url().should('include', '/achievements/new#styling')
    })

    it('Can update the title and see it in the preview', () => {
      cy.getByPlaceHolderText('Untitled achievement').type(achievementTitle)
      cy.get(selectors.previewContainer).contains(achievementTitle.toUpperCase())
    })

    it('Can update the theme color', () => {
      cy.get(selectors.previewContainer).should(
        'have.css',
        'background',
        'rgba(0, 0, 0, 0) radial-gradient(rgb(32, 45, 60), rgb(15, 26, 38)) repeat scroll 0% 0% / auto padding-box border-box'
      )
      select('Dark', 'Light')
      cy.get(selectors.previewContainer).should(
        'have.css',
        'background',
        'rgba(0, 0, 0, 0) radial-gradient(rgb(255, 255, 255), rgb(216, 216, 216)) repeat scroll 0% 0% / auto padding-box border-box'
      )
    })

    it('Can update the Message', () => {
      cy.getByPlaceHolderText('Congratulations, you have earned this achievement')
        .clear()
        .type('Test completion message')
      cy.get(selectors.previewContainer).contains('Test completion message')
    })
  })
})
