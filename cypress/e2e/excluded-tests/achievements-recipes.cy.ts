import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail = ''

const password = Cypress.env('COMMON_TEST_PASSWORD')
const ticketNumber = 'ED-17794: '
let customAchievementsTitle: string

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
  selectMenu: '[class*="ed-select__menu"]',
  learnersOutput: '[data-testid*=generated-text]',
  achievementStatus: '[class*="ed-select__single-value"]',
  achievementStatusMenuList: '[class*="ed-select__menu-list"]',
  statusLive: '#react-select-2-option-0',
  statusArchived: '#react-select-2-option-1',
  achievementBreadcrumb: '[class*="StyledBreadcrumbList"]',
  recipeLiveWarning: '[class*="StyledWarningContainer"]',
  recipeInputFields: '[data-testid*="achievement-recipe"]',
  errorItems: '[class*="ErrorHighlight"]'
}

function select(dropdownText: string, optionText: string) {
  cy.get(selectors.selectCriteria).contains(dropdownText).click()
  cy.get(selectors.selectMenu)
    .contains(optionText)
    .then(option => {
      cy.wrap(option).contains(optionText)
      cy.wrap(option).click()
    })
}

function navigateToAchievement() {
  cy.navigateTo('LMS', 'achievements/new#recipe')
  cy.wait('@componentsLoaded')
  cy.getByPlaceHolderText('Untitled achievement').type(customAchievementsTitle)
}

function setAchievementToLive() {
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
}

describe('Feature: As an LMS admin - Create an Achievement', () => {
  beforeEach('Define network calls', () => {
    cy.intercept('POST', 'api/custom-achievements').as('achievementCreated')
    cy.intercept('PUT', 'api/custom-achievements').as('achievementUpdated')
    cy.intercept('GET', 'api/custom-achievements/components').as('componentsLoaded')
    customAchievementsTitle = ticketNumber + Cypress.currentTest.title
  })

  it('Recipe: Complete 3 Lessons monthly for 3 months', () => {
    //Setup an Enterprise account
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)

    cy.navigateTo('LMS', 'home')
    cy.url().should('include', 'home')
    cy.upgradeToEnterprisePlan(adminEmail, password)
    navigateToAchievement()

    select('Select the criteria', 'Complete')
    cy.getByType('number').clear().type('{rightarrow}3{leftarrow}{backspace}')
    select('Course', 'Lesson')
    select('Once', 'Monthly')
    cy.getByValue('1').clear().type('{rightarrow}3{leftarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Complete 3 lesson(s) monthly for 3 month(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Complete 2 Courses weekly for 2 weeks', () => {
    navigateToAchievement()

    select('Select the criteria', 'Complete')
    cy.getByType('number').clear().type('{rightarrow}2{leftarrow}{backspace}')
    select('Once', 'Weekly')
    cy.getByValue('1').clear().type('{rightarrow}2{leftarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Complete 2 course(s) weekly for 2 week(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Score 100% Lesson for 29 days', () => {
    navigateToAchievement()

    select('Select the criteria', 'Score')
    select('Course', 'Lesson')
    select('Once', 'Daily')
    cy.getByValue('1').clear().type('{leftarrow}29{rightarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Score 100 % on a lesson(s) daily for 29 day(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Score 100 % Course monthly for 2 months and earn 5 stars weekly for 4 weeks', () => {
    navigateToAchievement()

    select('Select the criteria', 'Score')
    select('Once', 'Weekly')
    cy.getByValue('1').clear().type('{rightarrow}2{leftarrow}{backspace}')

    cy.getByButtonText('Add another item').click()
    select('Select the criteria', 'Earn')
    select('Once', 'Weekly')
    cy.getByValue('1').clear().type('{rightarrow}4{leftarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains(
      'Score 100 % on a course(s) weekly for 2 week(s) and earn 5 star(s) weekly for 4 week(s).'
    )
    cy.getByButtonText('Save').should('be.enabled').click().wait('@achievementCreated')
    cy.get(selectors.achievementStatus).contains('Draft')

    select('Weekly', 'Monthly')
    cy.get(selectors.learnersOutput).contains(
      'Score 100 % on a course(s) monthly for 2 month(s) and earn 5 star(s) weekly for 4 week(s).'
    )

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementUpdated')
  })

  it('Recipe: Earn 3 stars daily for 30 days', () => {
    navigateToAchievement()

    select('Select the criteria', 'Earn')
    cy.getByValue('5').clear().type('{leftarrow}3{rightarrow}{backspace}')
    select('Once', 'Daily')
    cy.getByValue('1').clear().type('{leftarrow}30{rightarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Earn 3 star(s) daily for 30 day(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Earn 10 stars weekly for 6 weeks', () => {
    navigateToAchievement()

    select('Select the criteria', 'Earn')
    cy.getByValue('5').clear().type('{leftarrow}10{rightarrow}{backspace}')
    select('Once', 'Weekly')
    cy.getByValue('1').clear().type('{leftarrow}6{rightarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Earn 10 star(s) weekly for 6 week(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Open EdApp 1 and Earn 3 stars Once', () => {
    navigateToAchievement()

    select('Select the criteria', 'Open')
    cy.getByButtonText('Add another item').click()

    select('Select the criteria', 'Earn')
    cy.getByValue('5').clear().type('{leftarrow}3{rightarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Open EdApp 1 time(s) and earn 3 star(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })

  it('Recipe: Open EdApp 2 monthly for 2 months', () => {
    navigateToAchievement()

    select('Select the criteria', 'Open')
    cy.getByValue('1').clear().type('{leftarrow}2{rightarrow}{backspace}')
    select('Once', 'Monthly')
    cy.getByValue('1').clear().type('{leftarrow}2{rightarrow}{backspace}')
    cy.get(selectors.learnersOutput).contains('Open EdApp 2 time(s) monthly for 2 month(s).')

    setAchievementToLive()
    cy.getByButtonText('Set to live').click().wait('@achievementCreated')
  })
})
