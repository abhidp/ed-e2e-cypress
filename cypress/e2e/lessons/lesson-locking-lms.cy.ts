import {
  getLmsUserProfileFromHippo,
  lockLessonByUser,
  mockFeatureFlags,
  registerNewLMSUser,
  UserType
} from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

const adminUser = createEmail()
const authorUser = createEmail()
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-19577-Course'
const lessonTitle = 'ED-19577-lesson'
let courseId: string
let lessonId: string
let applicationId: string

describe('Feature: LMS Lesson Edit Locking', () => {
  describe('As an LMS admin', () => {
    beforeEach(() => {
      mockFeatureFlags([{ key: 'enable-lesson-locking-lms', value: true }])
    })
    it('Create an account, learner, course and lesson', () => {
      //Create LMS account and upgrade to Enterprise plan
      cy.createLmsAccount(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)
      getLmsUserProfileFromHippo(adminUser, password).then(profileResponse => {
        applicationId = profileResponse.body.userApplicationId
        return registerNewLMSUser(authorUser, password, applicationId, [UserType.AUTHOR])
      })
      //Create course and lesson
      cy.createCourseLessonAndSlide(adminUser, password, courseTitle, lessonTitle, true, true).then(
        response => {
          courseId = response.courseId
          lessonId = response.lessonId
        }
      )
    })

    it('locks the lesson via the API by the author, which displays the lock for the admin', () => {
      lockLessonByUser(courseId, lessonId, authorUser, password)

      // Lesson Edit page lock warning
      cy.navigateTo('LMS', `/lesson/${lessonId}/edit`)
      cy.contains(
        `This lesson is currently being edited by ${authorUser}. You can dismiss the current author, but they will lose any unsaved changes.`
      ).should('be.visible')

      // Lesson View page lock warning
      cy.contains('Back to lesson page').click()
      cy.getByTestId('EditLessonContentButton').should('be.disabled') // Cypress can't hover so can't test tooltip

      // Lessons List lock warning
      cy.contains(courseTitle).click()
      cy.getByButtonText('Edit content').should('be.disabled') // Cypress can't hover so can't test tooltip
    })

    it('allows the admin to override the lesson lock', () => {
      // Lesson Edit page lock warning
      cy.navigateTo('LMS', `/lesson/${lessonId}/edit`)
      cy.getByButtonText('Edit anyway').click()
      cy.contains(
        `This lesson is currently being edited by ${authorUser}. You can dismiss the current author, but they will lose any unsaved changes.`
      ).should('not.exist')
    })

    it('Shows the lesson lock for the author, and navigates to the lesson page automatically', () => {
      // Lesson Edit page lock warning
      cy.logOutLMS()
      cy.loginLMS(authorUser, password)
      // lock lesson by admin
      lockLessonByUser(courseId, lessonId, adminUser, password)

      cy.navigateTo('LMS', `/lesson/${lessonId}/edit`)

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3500) // Redirects after 3 seconds
      cy.url().should('include', `v2/course/${courseId}`)

      // Lessons List lock warning
      cy.contains(courseTitle).click()
      cy.getByButtonText('Edit content').should('be.disabled') // Cypress can't hover so can't test tooltip

      // Lesson View page lock warning
      cy.navigateTo('LMS', `v2/lesson/${lessonId}`)
      cy.getByTestId('EditLessonContentButton').should('be.disabled') // Cypress can't hover so can't test tooltip
    })
  })
})
