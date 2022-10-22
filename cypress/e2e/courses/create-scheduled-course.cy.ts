import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { selectDateFromDatePicker } from 'cypress/support/helper/utils'
import dayjs from 'dayjs'

let adminEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const courseTitle = `ED-22436 - Course`
const lessonTitle = `ED-22436 - Lesson`
let courseId: string
let lessonId: string

const scheduledDate = dayjs().add(1, 'week')

describe('Feature: Create a scheduled course in LMS and learners can`t access it', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: 'api/courses/*' }).as('courseCreated')
    cy.intercept({ method: 'POST', url: 'api/courses/*/publish' }).as('courseScheduled')
  })

  it('Create a draft course and lesson via Api', () => {
    adminEmail = createEmail()
    const learnerEmail = `edappt+learner+${adminEmail}`
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)
    cy.createCourseAndLesson(adminEmail, password, courseTitle, lessonTitle, false, false).then(
      res => {
        courseId = res.courseId
        lessonId = res.lessonId
      }
    )

    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, [
      'app-user',
      'prizing-user'
    ])

    cy.task('setValue', { adminEmail, learnerEmail })
  })

  it('Navigate to Api created course and schedule it', () => {
    cy.navigateTo('LMS', `v2/course/${courseId}`).wait('@courseCreated')
    cy.url().should('include', courseId)
    cy.getByTestId('PublishButton').click()

    //Draft lessons select and publish modal
    cy.getByTestId('dialog')
      .should('exist')
      .within(dialog => {
        cy.wrap(dialog)
          .should('contain.text', 'Your course has unpublished lessons')
          .and(
            'contain',
            'Unpublished lessons will not be displayed to learners. Select which lessons you would like to publish'
          )

        cy.wrap(dialog).getByButtonText('Skip').should('be.enabled').click()
      })

    //Date picker
    cy.getByTestId('dialog').should('exist').and('contain', 'Publish date')
    cy.getByTestId('publish-select').should('exist').click()

    cy.get('#react-select-2-option-1').should('exist')
    cy.get('#react-select-2-option-1').contains('Later').click()
    cy.getByTestId('dateInput').click()

    if (!isScheduledDateInSameMonth(scheduledDate)) {
      cy.get('[aria-label="Next Month"]').click()
    }

    selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), scheduledDate)

    cy.getByTestId('dialog').should('be.visible')
    cy.getByTestId('dialog').contains('Advanced settings').click()

    cy.getByTestId('completion-certificate-toggle').should('not.be.checked').click()
    cy.getByTestId('completion-certificate-toggle-Checkbox').should('be.checked')

    cy.getByTestId('course-leaderboard-toggle').should('not.be.checked').click()
    cy.getByTestId('course-leaderboard-toggle-Checkbox').should('be.checked')

    cy.getByButtonText('Schedule')
      .click()
      .wait('@courseScheduled')
      .its('request.body.publishOn')
      .should('include', scheduledDate.format('YYYY-MM-DD'))

    //Course scheduled dialog
    cy.getByTestId('dialog').should('be.visible').and('contain.text', 'Course Scheduled')
    cy.getByButtonText('Return to course').click()

    //Scheduled status
    cy.getByTestId('course-status').should('be.visible').and('contain.text', 'Scheduled')
    cy.getByTestId(`content-card-contents-${lessonId}`).should('contain.text', 'Draft')

    //Check scheduled course in courseware page
    cy.navigateTo('LMS', 'courseware')
    cy.getByTestId(`content-card-contents-${courseId}`)
      .should('be.visible')
      .and('contain.text', 'Scheduled')
  })

  it('Learner should not be able to view scheduled course', () => {
    cy.task('getValue').then(value => {
      cy.loginToLearnersAppViaUI(value.learnerEmail, password)
    })

    cy.getByTestId(`CourseCard-${courseId}`).should('not.exist')
  })
})

function isScheduledDateInSameMonth(date: dayjs.Dayjs) {
  const startDate = new Date()
  //Date picker allows to pick a date from next day
  startDate.setDate(startDate.getDate() + 1)

  return startDate.getMonth() === date.month()
}
