import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail = ''

const password = Cypress.env('COMMON_TEST_PASSWORD')
const customAchievementsTitle = 'ED-16374: LMS - Ability for Admins to create a custom achievement'

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
  selectCriteria: '[class*="ed-select__value-container"]',
  learnersOutput: '[data-testid*=generated-text]',
  achievementStatus: '[class*="ed-select__single-value"]',
  achievementStatusMenuList: '[class*="ed-select__menu-list"]',
  statusLive: '#react-select-2-option-0',
  statusArchived: '#react-select-2-option-1',
  achievementBreadcrumb: '[class*="StyledBreadcrumbList"]',
  recipeLiveWarning: '[class*="AlertContainer"]',
  recipeInputFields: '[data-testid*="achievement-recipe"]',
  errorItems: '[class*="ErrorHighlight"]'
}

function select(dropdownText: string, optionText: string) {
  cy.get(selectors.selectCriteria).contains(dropdownText).click()
  cy.get('[class*="ed-select__menu"]')
    .contains(optionText)
    .then(option => {
      cy.wrap(option).contains(optionText)
      cy.wrap(option).click()
    })
}

describe('Feature: Create an Achievement - As an LMS admin', () => {
  //Create Free Plan and Check that admin cannot create an achievement
  it('Cannot create Achievement on Free plan', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)

    cy.navigateTo('LMS', 'achievements')
    cy.url().should('include', 'achievements')
    cy.getByButtonText("Let's get started").click()
    cy.url().should('include', 'select-plan')
    cy.navigateTo('LMS', 'achievements')

    cy.getByButtonText('Create an achievement').should('be.disabled')
  })

  it('Can create Draft Achievement on Enterprise plan', () => {
    cy.upgradeToEnterprisePlan(adminEmail, password)

    cy.navigateTo('LMS', 'achievements')
    cy.getByButtonText('Create an achievement').click()
    cy.url().should('include', '/achievements/new#recipe')

    cy.intercept('POST', 'api/custom-achievements').as('achievementCreated')
    cy.intercept('PUT', 'api/custom-achievements').as('achievementUpdated')

    //Save without title and recipe (Warning message)
    cy.getByButtonText('Save').should('be.enabled').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Your achievement was unable to be saved')
      .and('contain.text', 'Please review the following errors and try again:')
      .and('contain.text', 'title')
      .and('contain.text', 'recipe')

    cy.getByButtonText('Back to editing').click()

    //Setup a recipe
    cy.getByTestId('achievement-recipes').find(selectors.selectCriteria)

    select('Select the criteria', 'Complete')
    cy.getByType('number').clear().type('{rightarrow}2{leftarrow}{backspace}')
    select('Course', 'Lesson')
    select('Once', 'Daily')
    cy.getByValue('1').clear().type('{rightarrow}3{leftarrow}{backspace}')

    //Save without title (Warning message)
    cy.getByPlaceHolderText('Untitled achievement').type(customAchievementsTitle).clear()
    cy.getByButtonText('Save').should('be.enabled').click()
    cy.getByTestId('dialog').should('be.visible')
    cy.get(selectors.errorItems).should('not.contain.text', 'recipe')
    cy.getByButtonText('Back to editing').click()

    cy.getByPlaceHolderText('Untitled achievement').type(customAchievementsTitle)

    //Checking data after Saving
    cy.getByButtonText('Save').should('be.enabled').click().wait('@achievementCreated')
    cy.get(selectors.achievementStatus).contains('Draft')
    cy.get(selectors.learnersOutput).contains('Complete 2 lesson(s) daily for 3 day(s)')
    cy.getByButtonText('Add another item').should('be.enabled')
    cy.get(selectors.achievementBreadcrumb).contains(customAchievementsTitle)

    //Set the achievement to Live
    cy.get(selectors.achievementStatus).contains('Draft').click()
    cy.get(selectors.statusLive).click()

    cy.getByButtonText('Save').should('be.enabled').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Ready to set your achievement to live?')
      .and(
        'contain.text',
        'This achievement will be live for learners to earn. Once set to live, you will no longer be able to edit the recipe.'
      )
    cy.getByButtonText('Set to live').click().wait('@achievementUpdated')

    //Checking data after Updating the achievements
    cy.get(selectors.learnersOutput).contains('Complete 2 lesson(s) daily for 3 day(s)')
    cy.contains(
      'Recipe cannot be edited once set to live to ensure fairness for all learners in earning the same achievement.'
    )
    cy.get(selectors.achievementBreadcrumb).contains(customAchievementsTitle)
    cy.get(selectors.recipeInputFields).should('be.disabled')
    cy.getByButtonText('Add another item').should('not.exist')
  })

  it('Can create Live Achievement on Enterprise plan', () => {
    cy.navigateTo('LMS', 'achievements')
    cy.getByButtonText('Create an achievement').click()
    cy.url().should('include', '/achievements/new#recipe')

    cy.intercept('POST', 'api/custom-achievements').as('achievementCreated')
    cy.intercept('PUT', 'api/custom-achievements').as('achievementUpdated')

    //Set the achievement to Live
    cy.get(selectors.achievementStatus).contains('Draft').click()
    cy.get(selectors.statusLive).click()

    //Save without recipe (Warning message)
    cy.getByPlaceHolderText('Untitled achievement').type(customAchievementsTitle)
    cy.getByButtonText('Save').should('be.enabled').click()
    cy.getByTestId('dialog').should('be.visible')
    cy.get(selectors.errorItems).should('not.contain.text', 'title')
    cy.getByButtonText('Back to editing').click()

    //Setup first recipe
    cy.getByPlaceHolderText('Untitled achievement').type(customAchievementsTitle)

    cy.getByTestId('achievement-recipes').find(selectors.selectCriteria)

    select('Select the criteria', 'Complete')
    cy.getByType('number').clear().type('{rightarrow}2{leftarrow}{backspace}')
    select('Once', 'Weekly')
    cy.getByValue('1').clear().type('{rightarrow}3{leftarrow}{backspace}')

    //Setup second recipe
    cy.getByButtonText('Add another item').click()
    select('Select the criteria', 'Score')

    //Save the achievement
    cy.getByButtonText('Save').should('be.enabled').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Ready to set your achievement to live?')
      .and(
        'contain.text',
        'This achievement will be live for learners to earn. Once set to live, you will no longer be able to edit the recipe.'
      )

    cy.getByButtonText('Set to live').click().wait('@achievementCreated')

    //Checking data after Saving
    cy.get(selectors.learnersOutput).contains(
      'Complete 2 course(s) weekly for 3 week(s) and score 100 % on a course(s).'
    )
    cy.getByTestId('achievement-recipes').find(selectors.recipeLiveWarning)
    cy.contains(
      'Recipe cannot be edited once set to live to ensure fairness for all learners in earning the same achievement.'
    )
    cy.get(selectors.achievementBreadcrumb).contains(customAchievementsTitle)
    cy.get(selectors.recipeInputFields).should('be.disabled')
    cy.getByButtonText('Add another item').should('not.exist')
  })

  // Archiving the achievements
  it('Can archive an Achievement on Enterprise plan', () => {
    cy.intercept('PUT', 'api/custom-achievements').as('achievementUpdated')

    cy.get(selectors.achievementStatus).contains('Live').click()
    cy.get(selectors.statusArchived).click()
    cy.getByButtonText('Save').should('be.enabled').click().wait('@achievementUpdated')

    cy.get(selectors.achievementStatus).contains('Archived').click()
    cy.get(selectors.achievementStatusMenuList).should('not.contain.text', 'Draft')
  })
})
