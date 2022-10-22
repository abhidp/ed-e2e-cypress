import {
  mockFeatureFlags,
  registerLearnerToGTCourse,
  toggleGroupTrainingForCourse
} from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail = ''
let learnerEmail = ''

const password = Cypress.env('COMMON_TEST_PASSWORD')

const courseTitle = 'ED-24138: Group Training Add Attendee Course'
const lessonTitle = 'ED-24138: Group Training Add Attendee lesson'
let courseId: string
let sessionId: string

const selectors = {
  groupTrainingCard: (courseId: string) => `content-card-contents-${courseId}`,
  attendeesModal: 'gt-attendee-modal'
}

describe('Feature: Group Training - Add Attendees through learner registration', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'POST', url: `/api/courses/**/group-training/sessions` }).as(
      'startSession'
    )
  })
  it('Can enable group training course', () => {
    adminEmail = createEmail()
    learnerEmail = `learner+${adminEmail}`
    cy.createLmsAccount(adminEmail, password)
    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
    cy.createCourseLessonAndSlide(adminEmail, password, courseTitle, lessonTitle, true, true).then(
      res => {
        courseId = res.courseId
        toggleGroupTrainingForCourse(adminEmail, password, courseId, true).then(() => {
          cy.navigateTo('LMS', 'group-training')
        })
      }
    )
  })

  it('Can view course in Group training page and start session', () => {
    cy.getByTestId(selectors.groupTrainingCard(courseId))
      .should('be.visible')
      .within(() => {
        cy.contains(courseTitle)

        // Buttons are hidden until hover
        cy.contains('Start Session').should('not.be.visible')
        // Force button styles to change

        cy.getByButtonText('Start Session')
          .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
          .click()

        cy.wait('@startSession').then(interception => {
          sessionId = interception.response.body.sessionId
        })
      })
  })
  it('can add attendees through learner registration', () => {
    //session modal opens
    cy.getByTestId('dialog')
      .should('be.visible')
      .within(() => {
        cy.contains('Group training session')
        cy.getByButtonText('Add attendees').click()
      })

    //attendee modal opens
    cy.getByTestId(selectors.attendeesModal)
      .should('be.visible')
      .within(() => {
        cy.contains(courseTitle)
        cy.contains('0 learners added')
        registerLearnerToGTCourse(learnerEmail, password, sessionId).then(() => {
          cy.contains(learnerEmail)
          cy.contains('1 learner added')
        })
      })
  })
})
