import { createEmail } from 'cypress/support/helper/common-util'

let adminUser: string
let learnerEmail: string
let rrId: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const rapidRefreshSupportLink = 'https://support.edapp.com/rapid-refresh-feature'
const rapidRefreshXls = 'rapid-refresh/rapidRefreshQuiz.xlsx'
const quizTitle = 'ED-18135-quiz'
const quizDescription = 'ED-18135-quizDescription'

const selectors = {
  courseMenuItem: '#courseware-menu-item',
  rapidRefreshMenuItem: 'a:contains("Rapid Refresh Quizzes")',
  getStartedButtonText: 'Get started',
  createQuizButtonText: 'Create quiz',
  emptyStateRRTitle: 'h3:contains("Create your first quiz with Rapid Refresh")',
  emptyStateRRParagraph:
    'p:contains("Automatically deliver quizzes at regular intervals to check understanding and reinforce learning.")',
  dialogWizard: 'dialog',
  downloadButton: `a:contains("Download template")`,
  uploadMyFileButton: 'Upload my file',
  chooseFileButton: 'uploadImageButton',
  backButton: 'backButton',
  continueButton: 'Continue',
  rapidRefreshDivId: '#rapid-refresh',
  rapidRefreshTitle: '[data-testid=HeadingEditorTitleInput]',
  draftState: 'h5:contains("Draft")',
  lessonIframe: '#iframe-main',
  quizIframe: '#lesson-iframe',
  slidesView: '#slides-view',
  lessonHeader: '#lesson-header',
  tabListAccessRules: 'TabList',
  toggleCheckbox: 'toggle-Checkbox',
  changeLogButton: '[data-testid="icon-button"]',
  quizTitle: '[placeholder="New Rapid Refresh"]',
  quizDescription: '[placeholder="Rapid Refresh Description"]',
  closedialogButton: '[data-testid="close-setting-dialog-button"]',
  datePickerNextIcon: '[aria-label="Next Month"]',
  datePicker: '[aria-disabled="false"]',
  chooseDate: 'react-datepicker__day',
  quizSummary: [
    { summary: 'Quiz type', value: 'Once' },
    { summary: 'Total questions', value: '5' },
    { summary: 'Session frequency', value: 'Once' }
    //Uncomment once its fixed
    //{ summary: 'Total Sessions', value: '1' },
    //{ summary: 'Questions per session', value: '5' }
  ]
}

describe('Feature: Create and schedule one-off quiz in LMS', () => {
  before('Create enterprise account in LMS', () => {
    adminUser = createEmail()

    //Create LMS account and upgarde to Enterprise plan via Api
    cy.createLmsAccount(adminUser, password)
    cy.upgradeToEnterprisePlan(adminUser, password)

    //Create learner
    learnerEmail = `edappt+learner+${adminUser}`
    cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
      'app-user',
      'prizing-user'
    ])
  })

  it('Navigate to rapid refresh quizzes page', () => {
    cy.navigateTo('LMS', '/home')
    cy.get(selectors.courseMenuItem).click()
    cy.get(selectors.rapidRefreshMenuItem).click()

    //assertions for empty state quiz page
    cy.url().should('include', '/courseware#rapid-refresh')
    cy.get(selectors.emptyStateRRTitle).should('be.visible')
    cy.get(selectors.emptyStateRRParagraph).should('be.visible')
    cy.getByButtonText(selectors.createQuizButtonText).should('be.visible')

    cy.contains('Learn more').should('be.visible').and('have.attr', 'href', rapidRefreshSupportLink)

    cy.get('[alt="rapid refresh"]').should('be.visible')
  })

  it('Upload quiz', () => {
    //action
    cy.getByButtonText(selectors.getStartedButtonText).click()

    //Upload quiz dialog wizard
    cy.getByTestId(selectors.dialogWizard).within(dialog => {
      cy.wrap(dialog).should('contain.text', 'Upload your questions to create a quiz')
      cy.wrap(dialog)
        .get(selectors.downloadButton)
        .should('be.visible')
        .and(
          'have.attr',
          'href',
          'https://admin.edapp.com/documents/Rapid Refresh Template v2.xlsm'
        )

      //Define quiz upload network calls
      cy.intercept({ method: 'POST', url: 'upload/uploadSuccess' }).as('uploadSuccess')
      cy.intercept({
        method: 'POST',
        url: 'api/rapid-refresh/xlsx/validate'
      }).as('xlsValidate')

      //upload quiz
      cy.wrap(dialog).getByButtonText(selectors.uploadMyFileButton).should('not.be.enabled')
      cy.wrap(dialog)
        .getByTestId(selectors.chooseFileButton)
        .attachFile(rapidRefreshXls)
        .wait('@uploadSuccess')
      cy.wrap(dialog)
        .getByButtonText(selectors.uploadMyFileButton)
        .should('be.enabled')
        .click()
        .wait('@xlsValidate')
    })
    //assertions on quiz validation wizard
    cy.getByTestId(selectors.dialogWizard).within(dialog => {
      cy.wrap(dialog).should('contain.text', "You're good to go!")
      cy.wrap(dialog).getByTestId(selectors.backButton).should('be.visible')
      cy.wrap(dialog).getByButtonText(selectors.continueButton).should('be.enabled').click()
    })
  })

  it('Validation on Draft quiz page', () => {
    cy.url().should('include', '/rapid-refresh/')
    cy.url().then(url => {
      rrId = url.split('/')[4]
    })
    //Assertions on draft quiz created
    cy.get(selectors.rapidRefreshDivId).within(rapidRefresher => {
      cy.wrap(rapidRefresher)
        .get(selectors.rapidRefreshTitle)
        .should('have.value', 'Untitled Rapid Refresh')
      cy.wrap(rapidRefresher).get(selectors.draftState).should('contain.text', 'Draft')

      //Assertion for RR preview
      cy.wrap(rapidRefresher)
        .get(selectors.lessonIframe)
        .iframe()
        .find(selectors.slidesView)
        .should('be.visible')
        .find(selectors.lessonHeader)
        .should('contain.text', '1 / 5')

      //Assertion for Quiz summary, Quiz leaderboard and retry toggle
      cy.wrap(rapidRefresher).contains('Quiz Summary').should('be.visible')
      cy.wrap(rapidRefresher).contains('Quiz leaderboard').should('be.visible')

      cy.get('h4:contains("Quiz leaderboard")')
        .parent()
        .siblings('[data-testid="toggle"]')
        .first()
        .children()
        .should('be.checked')

      //Assertion for leaderboard link
      cy.wrap(rapidRefresher)
        .contains('View Leaderboard')
        .and('have.attr', 'href', `/leaderboard/${rrId}`)

      //Assertion for retry toggle
      cy.wrap(rapidRefresher)
        .contains('Allow learners to retry incorrect questions')
        .parent()
        .siblings('[data-testid="toggle"]')
        .first()
        .children()
        .should('not.be.checked')

      //Assertion for reports and change log
      cy.wrap(rapidRefresher)
        .contains('Reports')
        .and('have.attr', 'href', '/analytics/rapid-refresh')

      cy.wrap(rapidRefresher).get(selectors.changeLogButton).contains('Change Log')

      //Check if clicking user groups takes to access rules tab
      cy.wrap(rapidRefresher).contains('All learners').click()
    })
    cy.getByTestId(selectors.dialogWizard).should('be.visible').and('contain.text', 'Settings')
    cy.getByClassNameLike(selectors.tabListAccessRules).contains('Access rules')
    cy.get(selectors.closedialogButton).click()
  })

  it.skip('Schedule one-off quiz', () => {
    //Define network calls
    cy.intercept({ method: 'PUT', url: `api/rapid-refresh/${rrId}/config` }).as('quizSaveConfig')

    //Add quiz title and description
    cy.get(selectors.quizTitle).click().clearAndType(quizTitle).wait('@quizSaveConfig')
    cy.get(selectors.quizDescription).click().clearAndType(quizDescription).wait('@quizSaveConfig')

    //Schedule config
    cy.contains('Schedule Quiz').click()

    cy.getByTestId(selectors.dialogWizard).within(dialog => {
      cy.wrap(dialog).should('contain.text', 'Schedule quiz')

      //Choose start date
      cy.wrap(dialog).contains('Start date').next().click()
      const startDate = getStartDate()

      if (!isStartDateInSameMonth(startDate)) {
        cy.get(selectors.datePickerNextIcon).click()
      }

      cy.get(selectors.datePicker).contains(startDate.getDate()).click()

      //Choose end date
      cy.wrap(dialog).contains('End date').next().click()
      const twoWeeksFromStartDate = getTwoWeeksFromStartDate(startDate)

      if (!isEndDateInSameMonth(twoWeeksFromStartDate)) {
        cy.get(selectors.datePickerNextIcon).click()
      }

      cy.get(selectors.datePicker).contains(twoWeeksFromStartDate.getDate()).click()

      //Unable to check if spaced session toggle button is disabled due to lack of element selector

      cy.wrap(dialog).contains('Allow learners to retry incorrect questions').click()
      cy.wrap(dialog).getByButtonText('Next').click()

      //Quiz schedule review
      cy.wrap(dialog).contains('Review').should('be.visible')
      cy.wrap(dialog).getByButtonText('Back').should('be.visible')
      cy.wrap(dialog)
        .getByButtonText('Schedule quiz')
        .should('be.visible')
        .click()
        .wait('@quizSaveConfig')
    })
    //Assertion after quiz has been scheduled
    cy.get(selectors.rapidRefreshDivId).within(rapidRefresher => {
      cy.wrap(rapidRefresher).should('not.contain', 'Schedule Quiz')
      cy.wrap(rapidRefresher).should('contain', 'In progress')
      cy.wrap(rapidRefresher)
        .contains('Allow learners to retry incorrect questions')
        .parent()
        .siblings('[data-testid="toggle"]')
        .first()
        .children()
        .should('be.checked')

      selectors.quizSummary.forEach(function (quiz) {
        cy.wrap(rapidRefresher).contains(quiz.summary).siblings().should('contain.text', quiz.value)
      })
    })
  })
})

describe.skip('As a learner', () => {
  // skip the tests for timebeing until the race condition is fixed
  it(`Login to app and open the quiz ${quizTitle}`, () => {
    //Define network call
    cy.intercept({ method: 'GET', url: 'api/rapid-refresh/sessions' }).as('getSessions')
    cy.intercept({ method: 'POST', url: 'api/Interactions/batch' }).as('batch')

    let questions: { question: string; answer: string }[] = []

    cy.loginToLearnersAppViaUI(learnerEmail, password)

    //Fetch question and answers from api - For future purpose to complete the quiz
    cy.wait('@getSessions').then(({ response }) => {
      expect(response.statusCode).to.eq(200)
      const slides = response.body.items[0].session.slides
      const metadata = slides
        .filter((slide: any) => slide.type !== 'exit')
        .map((slide: any) => slide.metadata)
      questions = metadata.map((metadatum: any) => ({
        question: metadatum.questions[0].question.content,
        answer: metadatum.questions[0].answers.find((answer: any) => answer.correct).content
      }))
      cy.task('setValue', { questions })
    })

    //Assert for lock icon to not to exist before opening the quiz
    cy.getByClassNameLike('LockedIcon').should('not.exist')

    //Open quiz
    cy.get(`[data-testid=CourseCard-${rrId}]`).contains(quizTitle).click()
    cy.url().should('include', `#rapid-refresh/${rrId}`)

    //quiz screen assertions
    cy.get('[data-testid="view-body"]')
      .should('contain', quizTitle)
      .and('contain.text', quizDescription)
      .and('contain.text', '5 Questions')
      .and('contain.text', '2.5 Minutes')
      .and('contain.text', 'Quiz 1/1')
    cy.getByButtonText('Start Quiz').click().wait('@batch')

    //Take the quiz - TO DO - Its hard coz of iframe. Hence commenting this part of code to use for future reference

    // cy.task('getValue').then((value: any) => {
    //   getThomasIframe().find('#slides').as('rootslide')
    //   cy.get('@rootslide').first().children().as('slides')
    //   //cy.get('@slides').should('have.length', value.questions.length)
    //   for (let i = 0; i < 4; i++) {
    //     cy.log(value)
    //     //cy.get('@slides')[i].should('have.class', '.active')
    //     cy.get('@slides').should('contain', value.questions[i].question)
    //     cy.get('@slides').contains(value.questions[i].answer).click()

    //     cy.get('@slides').contains('Continue').should('be.visible').click()

    //     getThomasIframe()
    //       .find('#slide-answer-container')
    //       .contains('Continue')
    //       .should('be.visible')
    //       .click()

    //     getThomasIframe().find('#slides').should('contain', value.questions[i].question)
    //     getThomasIframe().find('#slides').contains(value.questions[i].answer).click()
    //     getThomasIframe()
    //       .find('#slides')
    //       //.find('.slide-footer-touched')
    //       .contains('Ok, I’m done')
    //       .should('be.visible')
    //       .click()
    //     getThomasIframe().find('#slide-answer-container').contains('Continue').click()
    //   }
    // })
    // cy.get(selectors.quizIframe).iframe().find('#slides').contains('No one').click()
    // cy.contains('Ok, I’m done').should('be.visible').click()
    // cy.get('slide-answer-continue').click()
  })
})

function getTwoWeeksFromStartDate(startDate: Date): Date {
  const date = new Date(startDate)

  date.setDate(date.getDate() + 2 * 7)

  return date
}

function isEndDateInSameMonth(endDate: Date) {
  const curMonth = new Date().getMonth()

  const monthInTwoWeeks = endDate.getMonth()

  return curMonth === monthInTwoWeeks
}

function isWeekend(day: number) {
  return day % 6 === 0
}

function getStartDate() {
  const date = new Date()

  const day = date.getDay()

  if (isWeekend(day)) {
    day === 6 ? date.setDate(date.getDate() + 2) : date.setDate(date.getDate() + 1)
  }

  return date
}

function isStartDateInSameMonth(date: Date) {
  const curMonth = new Date().getMonth()

  return curMonth === date.getMonth()
}
