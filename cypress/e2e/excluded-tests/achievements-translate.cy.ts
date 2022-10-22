//Flakey
import { createEmail } from 'cypress/support/helper/common-util'
import defaultAchievements from 'cypress/fixtures/custom-achievements/default-achievements.json'

let adminEmail: string
const appUrl = Cypress.env('LMS')
const password = Cypress.env('COMMON_TEST_PASSWORD')
const customAchievementsTitle = 'ED-16486: LMS - Ability for Admins to translate their achievement'
const customAchievementsDescription = 'Open EdApp 1 time(s)'
const orginalLanguage = 'English'
const translatedLanguage = 'French'
const selectors = {
  engageMenuItem: '#engage-menu-item',
  achievementsMenuItem: '[href="/achievements"]',
  onboardingModal: 'custom-achievements-onboarding-modal',
  searchInput: '[data-testid="search-input"]',
  achievementListRow: "[data-testid*='selectable-table-row-']",
  upgradeBanner: '[data-testid="custom-achievements-free-upgrade-banner"]',
  translationsTab: '[data-testid="translations"]',
  recipeSelect: '.ed-select__value-container',
  achievementsTitleInput: '[placeholder="Untitled achievement"]',
  openMenuItem: '.ed-select__option:contains("Open")',
  languageSelect: '.ed-select__value-container',
  languageMenuItem: (language: string) => `.ed-select__option:contains("${language}")`
}

describe('Achievements list Translations', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements/**' }).as(
      'customAchievementDataFetched'
    )
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'GET', url: '/api/translate/cloud/locales' }).as('translationFetched')
    cy.intercept({ method: 'POST', url: '/api/custom-achievements' }).as('customAchievementCreated')
    cy.intercept({ method: 'POST', url: '/api/localization/translate' }).as('achievementTranslated')
    cy.intercept({ method: 'PUT', url: 'api/custom-achievements' }).as('achievementsUpdated')
  })
  describe('As LMS Admin with Free Plan', () => {
    it('Can not access Translations Tab when clicking into achievement', () => {
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.url().should('include', 'achievements')

      cy.getByButtonText("Let's get started").click()
      cy.url().should('include', 'select-plan')
      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.get(selectors.searchInput).type(defaultAchievements.Beginner)
      cy.get(selectors.achievementListRow).click()
      cy.url().should('not.contain', '#recipe')
    })

    it('Can not access Translations Tab through url', () => {
      cy.visit(`${appUrl}/achievements/new#translations`)
      cy.url().should('not.include', '#translations')
    })
  })

  describe('As LMS Admin with Enterprise Plan', () => {
    it('Can access Translations Tab when clicking into achievement', () => {
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.url().should('include', 'achievements')

      cy.get(selectors.searchInput).type(defaultAchievements.Beginner)
      cy.get(selectors.achievementListRow).click().wait('@customAchievementDataFetched')
      cy.get(selectors.translationsTab).click().wait('@translationFetched')
      cy.url().should('include', 'translations')
    })

    describe('Can view and translate default achievements', () => {
      it('Displays empty state for default achievement when no translations are available', () => {
        cy.contains('There are no translations for this achievement').should('be.visible')
        cy.contains('Achievements Translations').should('be.visible')
      })

      it('Can translate default achievement', () => {
        cy.getByButtonText('Add a translation').click().waitForDialogWindow()
        cy.getByButtonText('Add translation').should('be.disabled')
        cy.get(selectors.languageSelect).first().type(orginalLanguage)
        cy.get(selectors.languageMenuItem(orginalLanguage)).click()
        cy.getByButtonText('Add translation').should('be.disabled')
        cy.get(selectors.languageSelect).last().type(translatedLanguage)
        cy.get(selectors.languageMenuItem(translatedLanguage)).click()
        cy.getByButtonText('Add translation')
          .should('be.enabled')
          .click()
          .wait('@achievementTranslated')

        cy.contains(translatedLanguage).should('be.visible')
        cy.contains('Title').should('be.visible')
        cy.contains('Recipe Ingredients').should('be.visible')
        cy.contains('Message').should('be.visible')
        cy.getByButtonText('Delete').should('be.visible')

        cy.getByButtonText('Save').click().wait('@achievementsUpdated')
        cy.contains('Saved').should('be.visible')
        cy.getByButtonText('Add a translation').click().waitForDialogWindow()
        cy.contains('Translate from').should('not.exist')
      })
    })

    describe('Can translate Custom Achievements', () => {
      it('Displays empty state for custom achievement when no translations are available', () => {
        cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
        cy.url().should('include', 'achievements')

        cy.getByButtonText('Create an achievement').click()

        cy.get(selectors.achievementsTitleInput).type(customAchievementsTitle)
        cy.get(selectors.recipeSelect).click().get(selectors.openMenuItem).click()

        cy.get(selectors.translationsTab).click().wait('@translationFetched')
        cy.contains('There are no translations for this achievement').should('be.visible')
        cy.contains('Achievements Translations').should('be.visible')
        cy.contains(customAchievementsDescription).should('be.visible')
      })

      it('Can translate custom achievement', () => {
        cy.getByButtonText('Add a translation').click().waitForDialogWindow()
        cy.getByButtonText('Add translation').should('be.disabled')
        cy.get(selectors.languageSelect).first().type(orginalLanguage)
        cy.get(selectors.languageMenuItem(orginalLanguage)).click()
        cy.getByButtonText('Add translation').should('be.disabled')
        cy.get(selectors.languageSelect).last().type(translatedLanguage)
        cy.get(selectors.languageMenuItem(translatedLanguage)).click()
        cy.getByButtonText('Add translation')
          .should('be.enabled')
          .click()
          .wait('@achievementTranslated')

        cy.contains(translatedLanguage).should('be.visible')
        cy.contains('Title').should('be.visible')
        cy.contains('Recipe Ingredients').should('be.visible')
        cy.contains('Message').should('be.visible')
        cy.getByButtonText('Delete').should('be.visible')

        cy.getByButtonText('Add a translation').click().waitForDialogWindow()
        cy.contains('Translate from').should('not.exist')
        cy.getByButtonText('Cancel').click()

        cy.getByButtonText('Save').click().wait('@customAchievementCreated')
        cy.contains('Saved').should('be.visible')
      })
    })
  })
})
