/* eslint-disable cypress/no-unnecessary-waiting */
/* 
  - Admin creates Assignment 
  - Learner submits Assignment
  - Admin reviews and provides grades and feedback
  - Learner views feeback
*/

import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

const timestamp = `${Date.now()}`
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = `ED-15697 - Course`
const lessonTitle = `ED-15697 - Lesson`
const assignmentTitle = `ED-15697 - Assignment`
const assignmentDescription = `ED-15697 - You have to complete 100 pushups in 1 minute`
const submissionText = `ED-15697 - This is my submission TEXT`
const submissionComment = `ED-15697 - This is my submission COMMENT`
const feedbackComment = 'ED-15697 - Well Done, you have passed with flying colors !!'

let email: string
let adminEmail: string
let learnerEmail: string
let learnerId: string
let courseId: string
let lessonId: string
let assignmentId: string
let assignmentUrl: string

const selectors = {
  settingsLink: '[data-testid="assessment-settings-link"]',
  button: (text: string) => `button:contains("${text}")`
}

describe('Feature: Create Assignment in LMS', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
    cy.intercept({ method: 'GET', url: '/api/course/*/lessons' }).as('lessonCreated')

    cy.task('getValue').then(value => {
      courseId = value.courseId
      lessonId = value.lessonId
      assignmentId = value.assignmentId
      learnerEmail = value.learnerEmail
    })
  })

  describe('LMS Admin sets up Assignment', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/assessments').as('assignmentCreated')
      cy.intercept('PATCH', '/api/assessments/**').as('assignmentUpdated')
    })

    it('Create LMS and Learner accounts with Course and Lesson', () => {
      email = createEmail()
      adminEmail = `edappt+admin+${email}`
      learnerEmail = `edappt+learner+${email}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user']).then(
        learner => {
          learnerId = learner.body.id
          cy.task('setValue', { learnerId })
        }
      )
      cy.createCourseAndLesson(adminEmail, password, courseTitle, lessonTitle, true, true).then(
        res => {
          courseId = res.courseId
          lessonId = res.lessonId
          cy.task('setValue', { learnerEmail, courseId, lessonId })
        }
      )
    })

    it('Create an Assgignment', () => {
      cy.navigateTo('LMS', `v2/course/${courseId}`)

      cy.get(selectors.button('Create lesson')).click()
      cy.getByTestId('create-assignment').click().wait('@lessonCreated')

      cy.getByValue('Untitled assignment')
        .clearAndType(assignmentTitle)
        .wait('@assignmentUpdated')
        .then(res => {
          expect(res.response.statusCode).to.equal(200)
          assignmentId = res.response.body.id
          assignmentUrl = `assignment/${assignmentId}`
          cy.task('setValue', { assignmentId })
        })

      cy.getByTestId('PublishToggle-Checkbox').should('be.disabled')

      cy.getByTestId('discussionPromptTextInput')
        .clearAndType(assignmentDescription)
        .wait('@assignmentUpdated')
        .its('response.statusCode')
        .should('eq', 200)

      cy.getByTestId('PublishToggle-Checkbox').should('be.enabled')
      cy.get(`[data-testid="assessment-status"]`).contains('Draft', { matchCase: false })

      cy.getByTestId('PublishToggle-Checkbox').forceClick().wait('@assignmentUpdated')
      cy.get(`[data-testid="assessment-status"]`).contains('Published', { matchCase: false })

      cy.getByTestId('postAndCommentRadio').should('be.checked')
      cy.getByTestId('postOnlyRadio').should('not.be.checked')
      cy.getByTestId('postOnlyRadio').forceClick().wait('@assignmentUpdated')

      cy.getByTestId('allUsersRadio').should('be.checked')
      cy.getByTestId('sameUsrGrpRadio').should('not.be.checked')
    })

    it('Access Rules tab', () => {
      cy.navigateTo('LMS', `v2/course/${courseId}`)

      cy.getByTestIdLike(`content-card-contents-${assignmentId}`).should(
        'contain.text',
        assignmentTitle
      )

      cy.getByTestIdLike(`content-card-contents-${assignmentId}`)
        .contains('button', 'Configure')
        .click()

      cy.get(selectors.settingsLink).click()
      cy.getByTestId('access-rules').should('contain.text', 'Access rules').click()
      cy.url().should('include', `/assignment/${assignmentId}/settings/access-rules`)

      cy.getByTestId('selectable-list-box-unselected').should('contain.text', lessonTitle)
      cy.contains(lessonTitle).click().wait('@assignmentUpdated')

      cy.getByTestId('selectable-list-box-selected').should('contain.text', lessonTitle)

      cy.contains('Dates determine whether this assignment can be accessed')
        .parent()
        .get('input[data-testid="calendar-toggle-Checkbox"]')
        .forceClick()
        .wait('@assignmentUpdated')
    })

    it('More tab', () => {
      cy.navigateTo('LMS', assignmentUrl)
      cy.get(selectors.settingsLink).click()

      cy.getByTestId('more').should('contain.text', 'More').click()
      cy.url().should('include', `/assignment/${assignmentId}/settings/more`)
      cy.getByPlaceHolderText('Unique Identifier')
        .clearAndType(timestamp)
        .wait('@assignmentUpdated')
    })

    it('View submissions', () => {
      cy.navigateTo('LMS', `${assignmentUrl}#more`)

      cy.getByButtonText('View submissions').click()
      cy.contains(assignmentTitle).should('be.visible')
      cy.contains('There are no submissions yet.').should('be.visible')
    })

    it('Complete the lesson via API', () => {
      // complete lesson via POST .../api/ed-admin/complete-lessons-for-users
      cy.completeLessons(learnerId, lessonId)
    })
  })

  describe('Learner Completes Assignment', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/Interactions/batch').as('batch')
      cy.intercept('POST', `/api/assessments/*/posts`).as('assignmentSubmitted')
      cy.intercept('GET', '/api/users/sync').as('sync')
      cy.intercept('GET', `/api/slide-progress?lessonIds[0]=${lessonId}`).as('slideProgressStatus')
      cy.intercept('GET', '**/comments/grade').as('reviewSubmission')
      cy.intercept('POST', '**/comments').as('commented')
    })

    it('Learner Sign In and Verify progress percentage', () => {
      cy.loginToLearnersAppViaUI(learnerEmail, password)

      cy.intercept('GET', `api/courses/${courseId}/sync*`).as('getCourse')

      cy.navigateTo('LEARNERS_APP', `#course/${courseId}`).wait([
        '@getCourse',
        '@batch',
        '@sync',
        '@slideProgressStatus'
      ])

      cy.reload().wait(['@getCourse', '@batch', '@sync', '@slideProgressStatus']) // need to deal with achievement popup

      cy.getByTestId('main course')
        .find('[data-testid=progressPercentage]')
        .should('contain.text', '50%')
      cy.contains('Pass 100% of your lessons to complete this course').should('be.visible')
      cy.getByTestId('completed-icon').should('be.visible')
    })

    it('Complete Assignment', () => {
      cy.contains(assignmentTitle).forceClick()

      cy.contains(assignmentTitle).should('be.visible')
      cy.contains(assignmentDescription).should('be.visible')
      cy.contains('No Submission').should('be.visible')

      cy.contains('Submit').click()

      cy.getByPlaceHolderText('Type your submission').type(submissionText)
      cy.getByButtonText('Submit').last().click().wait('@assignmentSubmitted')

      cy.contains('Pending Grade').should('be.visible')
      cy.getByTestId('Badge-Wrapper').should('have.attr', 'value', '1')
      cy.getByTestId('Badge-Value').should('contain.text', '1')

      cy.contains('Pending Grade').click()
      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'Submit and pass an assignment')
      cy.getByTestId('dialog').getByButtonText('OK').click()
      cy.getByTestId('dialog').should('not.be.visible')

      cy.getByButtonText('Review Submission').click().wait('@reviewSubmission')
      cy.contains(submissionText).should('exist')

      // TODO: wait for a call to a happen
      cy.wait(1000)
      cy.getByTestId('detail submission').getByButtonText('Add a comment').click({ multiple: true })
      cy.getByPlaceHolderText('Add a comment').type(submissionComment)
      cy.getByButtonText('Send').click().wait('@commented')
    })
  })

  describe('Admin Reviews Submission', () => {
    it('LMS Admin views and grades Submission from Learner', () => {
      cy.navigateTo('LMS', `/assignment/${assignmentId}`)
      cy.getByButtonText('View submissions').click()

      cy.getByButtonText('View Submission').click()
      cy.url().should('include', 'submissions')

      cy.getByPlaceHolderText('Write your feedback...').type(feedbackComment)
      cy.contains('Select a grade').click()
      cy.get('#react-select-2-option-1').click()

      cy.intercept('POST', '**/comments/grade').as('gradeSubmitted')
      cy.getByButtonText('Publish Feedback').click().wait('@gradeSubmitted')
    })
  })

  describe('Learner receives grades and feedback', () => {
    it('Learner views grades and feedback', () => {
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.wait(2000)

      cy.navigateTo('LEARNERS_APP', `/#course/${courseId}`)
      cy.wait(2000).reload()

      cy.getByTestId('progressPercentage').should('contain.text', '100%')
      cy.contains('Well done! You’ve passed this course.').should('be.visible')

      cy.contains(assignmentTitle).forceClick()
      cy.contains('Passed').should('be.visible')

      cy.getByButtonText('View Submission').click()
      cy.contains(feedbackComment).should('be.visible')
      cy.contains('This feedback is private and only visible to you.').should('be.visible')
    })
  })
})
