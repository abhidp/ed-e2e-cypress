import {
  getDeeplinkCourse,
  getDeeplinks,
  getDeeplinkLesson,
  mockAllFeatureFlags
} from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let courseTitle: string
let lessonTitle: string
let learnerId: string

const adminEmail = createEmail()
const learnerEmail = `edappt+learner+${adminEmail}`

const password = Cypress.env('COMMON_TEST_PASSWORD')
const ticketNumber = 'ED-18104'

describe('As a Learner', () => {
  beforeEach(() => {
    mockAllFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  it('Sets up the account', () => {
    cy.createLmsAccount(adminEmail, password)
    cy.navigateTo('LMS', 'home')

    courseTitle = ticketNumber + Cypress.currentTest.title
    lessonTitle = ticketNumber + Cypress.currentTest.title
    cy.createCourseAndLesson(adminEmail, password, courseTitle, lessonTitle, true, true)

    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user']).then(
      learner => {
        learnerId = learner.body.id
      }
    )
  })

  it('Accesses course deeplink without restriction', () => {
    getDeeplinks(adminEmail, learnerId, password).then(deeplinksResponse => {
      cy.visit(getDeeplinkCourse(deeplinksResponse.body, courseTitle).launchURI)
      cy.url().should('include', '#course')
      cy.getByTestId('courseTitle').should('contain', courseTitle)
    })
  })

  it('Accesses lesson deeplink without restriction', () => {
    getDeeplinks(adminEmail, learnerId, password).then(deeplinksResponse => {
      cy.visit(
        getDeeplinkLesson(getDeeplinkCourse(deeplinksResponse.body, courseTitle), lessonTitle)
          .launchURI
      )
      cy.url().should('include', '#course')
      cy.getByTestId('lessonTitle').should('contain', lessonTitle)
    })
  })
})
