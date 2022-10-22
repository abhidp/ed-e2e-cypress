import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  link: (text: string) => `a:contains("${text}")`,
  tabItem: (text: string) => `a.collapse-menu-item:contains("${text}")`,
  settingsOption: (text: string) => `strong:contains("${text}")`,
  starsInput: (name: string) => `input[name="${name}"]`,
  checkboxLabel: (text: string) => `h4:contains("${text}")`,

  addCustomField: '[data-testid="add-dynamic-field"]',
  certificateCompanyName: 'input[name="certificate.companyName"]',
  dailyUseRewardInput: 'input[name="appOpenRewardAmount"]',

  spinToWin: 'img[src="/img/app-settings/spin-to-win.png"]',
  globlaCSSTextArea: 'div.ReactCodeMirror textarea[tabindex="0"]',

  customFieldLabel: '[data-testid="fieldLabel"]',
  customFieldName: '[data-testid="fieldName"]',
  customFieldSaveButton: '[data-testid="CustomFieldSaveButton"]',
  coursewareLesson: '[data-testid*="content-card-contents"]',
  editContentButton: '[data-testid="EditLessonContentButton"]',
  nextSlideArrow: '[data-testid="NextSlideArrow"]',
  elementByDataTestId: (id: string) => `[data-testid="${id}"]`,
  accountSettingsDropdown: '[data-testid="userSettingsDropdown"]',
  coursewareCard: '[data-testid*="content-card-contents"]',
  navBar: 'ul.nav.navbar-nav.navbar-left',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item'
}

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

let courseId: string
let lessonId: string

// skipped due to flakiness: Will be unskipped after investigation and stabilizing the test suite
// flaky failure eg: https://buildkite.com/edapp/ed/builds/18961#01831579-2853-4180-8b2c-aabebf5e2577
describe.skip('Feature: App Settings page', () => {
  const gotoAppSettings = () => {
    cy.get(selectors.accountSettingsDropdown).click({ force: true })
    cy.get(selectors.link('App Settings')).first().click()
    cy.url().should('include', 'app-settings')
  }

  it('Create account and navigate to LMS', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)
    cy.createCourseLessonAndSlide(
      email,
      password,
      'Cypress E2E Auto Course',
      'Cypress E2E Auto Lesson'
    ).then(res => {
      courseId = res.courseId
      lessonId = res.lessonId
    })

    cy.navigateTo('LMS')

    cy.get(selectors.navBar).contains('Course').should('exist')
    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.url().should('include', '/courseware')
  })

  it('Scenario: Enable Offline and Disable Leaderboard', () => {
    gotoAppSettings()
    cy.get(selectors.tabItem('More')).click()
    cy.url().should('include', 'panel-user-custom-fields')

    cy.get(selectors.elementByDataTestId('EnableOfflineCheckbox')).should('be.checked')
    cy.get(selectors.elementByDataTestId('EnableLeaderboardsCheckbox')).should('be.checked')

    cy.get(selectors.elementByDataTestId('EnableOfflineCheckbox')).click({ force: true })
    cy.getByTestId('saving-label').should('contain.text', 'Saved')

    cy.get(selectors.elementByDataTestId('EnableLeaderboardsCheckbox')).click({ force: true })
    cy.getByTestId('saving-label').should('contain.text', 'Saved')

    cy.get(selectors.elementByDataTestId('EnableOfflineCheckbox')).should('not.be.checked')
    cy.get(selectors.elementByDataTestId('EnableLeaderboardsCheckbox')).should('not.be.checked')
  })

  it('Scenario: Add user custom fields', () => {
    gotoAppSettings()
    cy.get(selectors.tabItem('More')).click()
    cy.url().should('include', 'panel-user-custom-fields')

    cy.get(selectors.addCustomField).click()
    cy.get(selectors.customFieldLabel).type('Custom field').blur()

    cy.intercept('PUT', '/api/accounts/customFields').as('customFieldSaved')
    cy.get(selectors.customFieldSaveButton).forceClick().wait('@customFieldSaved')

    cy.navigateTo('LMS', 'app-settings#panel-user-custom-fields')
    cy.get(selectors.customFieldName).should('have.value', 'customfield')
  })

  it('Scenario: Enable course completion certificate', () => {
    gotoAppSettings()
    cy.getByClassNameLike('collapse-menu-item').contains('Certificates').click()
    cy.url().should('include', 'panel-certificates')

    cy.get(selectors.elementByDataTestId('course-completion-toggle')).click()

    cy.navigateTo('LMS', `/v2/course/${courseId}/settings/completion?new-authoring`)
    cy.contains('Course Completion Certificate').should('be.visible')
    cy.contains(
      'Award learners with a certificate upon successful completion. If disabled, no certificates will be generated or awarded for this course.'
    ).should('be.visible')
  })

  it('Scenario: Enable global CSS', () => {
    cy.intercept('GET', 'api/accounts/app-settings/content').as('getContent')

    cy.navigateTo('LMS', '/app-settings#panel-content').wait('@getContent')
    cy.url().should('include', 'panel-content')

    cy.get(selectors.elementByDataTestId('GlobalCSSCheckbox')).click({ force: true })

    const action = () =>
      cy
        .get(selectors.globlaCSSTextArea)
        .type('h1{color:orange}', { force: true, parseSpecialCharSequences: false })
        .blur()

    cy.waitForMultipleRequests(
      [
        { route: '/app-settings', method: 'POST' },
        { route: '/api/accounts/app-settings/content', method: 'PATCH' }
      ],
      action
    )

    cy.navigateTo('LMS', `/v2/course/${courseId}`)

    cy.intercept('GET', '/api/lessons/**').as('fetchLesson')
    cy.get(selectors.coursewareLesson)
      .first()
      .click()
      .wait('@fetchLesson')
      .then(lesson => {
        expect(lesson.response.body).to.have.property('previewCustomCSS', 'h1{color:orange}')
      })
  })

  it('Scenario: Enable Social Learning', () => {
    gotoAppSettings()
    cy.get(selectors.tabItem('Engagement')).click()
    cy.url().should('include', 'panel-engagement')

    cy.get(selectors.elementByDataTestId('EnableSocialLearningCheckbox')).should('be.checked')

    cy.navigateTo('LMS', `/v2/lesson/${lessonId}`)

    cy.get(selectors.editContentButton).click()
    cy.get(selectors.nextSlideArrow).click()
    cy.get(selectors.checkboxLabel('Social Learning')).scrollIntoView().should('exist')
  })
})
