import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  savingLabel: '[class="saving-label"]',
  lessonIframe: '#iframe-main',
  slideHeader: '#lesson-header',
  slideBody: '#lesson-slides',
  slideFooter: '.slide-footer',
  lessonPageHeader: '.head-container',
  lessonPageBody: '.body-container',
  lessonMenu: '#lesson-menu',
  checkbox: `input[type="checkbox"]`,
  toggle: `input[data-testid="toggle-Checkbox"]`,
  calendarToggle: `input[data-testid="calendar-toggle-Checkbox"]`,
  lessonLogoImage: '#lesson-header-title-logo',
  calendarMonth: '.react-datepicker__month',
  calendarWeek: '.react-datepicker__week',
  calendarStartDate: '[placeholder="Start"]',
  calendarEndDate: '[placeholder="End"]',
  lessonURL: 'a[class="block lesson-url-proper"]',
  lessonPreview: '#lesson-text',
  settingsLink: '[data-testid="SettingsLink"]',
  lessonReview: '[data-testid="lesson-review"]',
  closeSettings: '[data-testid="close-setting-dialog-button"]',
  cardHoverOverlay: `*[class^="HoverOverlay"]`,

  dataTestId: (testId: string) => `[data-testid="${testId}"]`,
  placeHolderText: (text: string) => `[placeholder="${text}"]`,
  button: (text: string) => `button:contains("${text}")`,
  breadcrumbByTitle: (title: string) => `a.crumb-title:contains("${title}")`
}

let user: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const lessonName = 'ED-8997 - Lesson 1'
const courseName = 'ED-8997 - Create and Edit Lesson'
const preReqLesson = 'ED-8997 - Pre-Req Lesson'
let lessonId: string

describe('Feature: Create Lesson', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', url: '/api/course/*/lessons' }).as('lessonCreated')
    cy.intercept({ method: 'PUT', url: 'api/lessons/*' }).as('lessonSaved')
    cy.intercept({ method: 'PATCH', url: '**/setVisibility' }).as('lessonPublished')
  })

  it('Login to LMS', () => {
    user = createEmail()

    cy.createLmsAccount(user, password)
    cy.upgradeToEnterprisePlan(user, password)
    cy.createCourseLessonAndSlide(user, password, courseName, preReqLesson)
  })

  it('Navigate to courses page and open the Course', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.get(selectors.cardHoverOverlay).invoke('attr', 'style', 'opacity: 1')

    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Preview')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Edit')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()
    cy.url().should('include', '/v2/course')
  })

  it('Create a Lesson', () => {
    cy.get(selectors.button('Create lesson')).click()
    cy.getByTestId('create-lesson').click().wait('@lessonCreated')

    cy.getByValue('Untitled lesson')
      .clearAndType(lessonName)
      .wait('@lessonSaved')
      .then(lesson => {
        lessonId = lesson.response.body.id
      })

    cy.get(selectors.placeHolderText('Lesson Description'))
      .click()
      .type('ED-8997 - This is a description')
      .wait('@lessonSaved')

    cy.get(selectors.dataTestId('PublishToggle-Checkbox')).should('not.be.checked')
    cy.get(selectors.dataTestId('lesson-status'))
      .contains('Draft', { matchCase: false })
      .should('be.visible')

    cy.contains('Review content')
    cy.contains('Edit content')
    cy.contains('Lesson preview', { matchCase: false })
  })

  it('Preview - Validate default Title and Exit Slides', () => {
    cy.get(selectors.lessonIframe)
      .iframe()
      .find(selectors.slideHeader)
      .should('contain.text', '1 / 2')

    cy.get(selectors.lessonIframe)
      .iframe()
      .find(selectors.slideBody)
      .should('contain.text', 'A title slide')
      .and('contain.text', 'An optional subtitle')

    cy.get(selectors.dataTestId('next-slide-button')).click()

    cy.get(selectors.lessonIframe)
      .iframe()
      .find(selectors.slideHeader)
      .should('contain.text', '2 / 2')

    cy.get(selectors.lessonIframe)
      .iframe()
      .find(selectors.slideBody)
      .should('contain.text', `That’s it!`)
      .and('contain.text', `Nice work. You’ve completed this lesson.`)
  })

  it('Display tab - Validate PreLesson and PostLesson settings', () => {
    cy.get(selectors.settingsLink).forceClick()
    cy.get(selectors.dataTestId('display')).click()
    cy.url().should('include', 'display')

    cy.contains('Hide Lesson Details')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
    cy.contains('Hide Progress').should('be.visible')
    cy.contains('Hide Content Type').should('be.visible')

    cy.contains('Enable Stars').should('be.visible')
    cy.contains('Hide Star Information').should('be.visible')
    cy.contains('Show Star Progress').should('be.visible')
    cy.contains('Show Star Availability').should('be.visible')

    cy.contains('Enable Stars')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')

    cy.contains('Enable Answer Feedback')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')

    cy.contains('Hide Lesson Score')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')

    cy.contains('Hide Response Summary')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
  })

  it('Access Rules tab - Set access Dates, Prerequisites, Lesson Sharing', () => {
    cy.get(selectors.dataTestId('access-rules')).click()
    cy.url().should('include', 'access_rules')

    cy.contains('Dates determine whether this lesson can be accessed')
      .should('be.visible')
      .parent()
      .get(selectors.calendarToggle)
      .click({ force: true })
      .wait('@lessonSaved')

    cy.get(selectors.dataTestId('startDateInput')).get(selectors.calendarStartDate).click()
    cy.get(selectors.calendarMonth).get(selectors.calendarWeek).last().children().first().click()

    cy.get(selectors.dataTestId('endDateInput')).get(selectors.calendarEndDate).click()
    cy.get(selectors.calendarMonth).get(selectors.calendarWeek).last().children().last().click()

    cy.get(selectors.dataTestId('selectable-list-box-unselected')).should(
      'contain.text',
      preReqLesson
    )

    cy.contains(preReqLesson).click().wait('@lessonSaved')

    cy.get(selectors.dataTestId('selectable-list-box-selected')).should(
      'contain.text',
      preReqLesson
    )

    cy.contains('Share this lesson')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')

    let learnersAppUrl = ''

    Cypress.env('NODE_ENV') === 'LOCAL'
      ? (learnersAppUrl = 'http://localhost:8085')
      : (learnersAppUrl = Cypress.env('LEARNERS_APP'))

    cy.get(selectors.lessonURL)
      .should('have.attr', 'href')
      .and('equal', `${learnersAppUrl}/lessons/${lessonId}/`)
  })

  it('Completion tab - Set Minimum Score', () => {
    cy.get(selectors.dataTestId('completion')).click()
    cy.url().should('include', 'completion')

    //Minimum Score
    cy.contains('Require A Minimum Score')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
    cy.get(selectors.dataTestId('minScoreInput'))
      .type('33', { force: true })
      .blur()
      .wait('@lessonSaved')

    //Lock this lesson for
    cy.contains('Lock This Lesson After Failing')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
    cy.get(selectors.dataTestId('lockLessonForInput'))
      .type('3', { force: true })
      .wait('@lessonSaved')

    //Number of attempts allowed
    cy.contains('Reset Course Completion After Failing')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
    cy.get(selectors.dataTestId('attemptsAllowedInput'))
      .type('5', { force: true })
      .wait('@lessonSaved')

    cy.contains('Lock After Completion')
      .should('be.visible')
      .parent()
      .find(selectors.checkbox)
      .click({ force: true })
      .wait('@lessonSaved')
  })

  it('More tab - SCORM package, Language and Platform setups', () => {
    cy.get(selectors.dataTestId('more')).click()
    cy.url().should('include', 'more')

    cy.get(selectors.dataTestId('downloadScormLink'))
      .should('be.visible')
      .and('contain.text', 'DownloadSCORM Package')
      .and('have.attr', 'href', `/scorm/lesson/${lessonId}`)

    cy.getByTestId('scormExitButton').parent().click().wait('@lessonSaved')
    cy.getByTestId('preventLogoutOnExit').parent().click().wait('@lessonSaved')

    cy.get('#language-select')
      .find('[class*="ed-select__value-container"]')
      .contains('English')
      .click()

    cy.get('[class*="ed-select__menu-list"]')
      .contains('Afrikaans')
      .forceClick()
      .wait('@lessonSaved')

    cy.get(selectors.placeHolderText('Unique identifier')).type('wxyz1234').wait('@lessonSaved')

    cy.get(selectors.dataTestId('Selected Platforms'))
      .should('be.visible')
      .and('contain.text', 'Web Browser - Desktop')
      .and('contain.text', 'Web Browser - Mobile Devices')
      .and('contain.text', 'Native App - iOS')
      .and('contain.text', 'Native App - Android')

    cy.contains('Native App - iOS').click().wait('@lessonSaved')

    cy.get(selectors.dataTestId('All Platforms'))
      .should('be.visible')
      .and('contain.text', 'Native App - iOS')
    cy.get(selectors.closeSettings).click({ force: true })
  })

  it('Review Lesson Text', () => {
    cy.get(selectors.lessonReview).click()
    cy.url().should('include', 'review')

    cy.get('a').contains('Print').should('be.visible')
    cy.get('a').contains('Edit Content').should('be.visible')

    cy.get(selectors.lessonPreview)
      .should('contain.text', 'Slide 1')
      .and('contain.text', 'Title Slide')
      .and('contain.text', `Ok, let’s go!`)
      .and('contain.text', 'Slide 2')
      .and('contain.text', 'Exit Lesson')
      .and('contain.text', 'Nice work. You’ve completed this lesson.')
  })

  it('Publish Lessons using the publish button on lesson cards in Course page', () => {
    cy.get(selectors.breadcrumbByTitle(courseName)).click()
    cy.url().should('include', '/v2/course')

    cy.get(selectors.dataTestId('coursewareStatus')).should('contain.text', 'Draft')

    cy.get(selectors.dataTestId('toggle')).first().click().wait('@lessonPublished')
    cy.get(selectors.dataTestId('toggle')).last().click().wait('@lessonPublished')
  })
})
