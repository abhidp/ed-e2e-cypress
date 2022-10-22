import { configureStarInfoForPreLessonScreen } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminUser: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-17075-Course'
const lessonTitle = 'ED-17075-lesson'
let courseId: string
let lessonId: string

describe('Feature: Stars on pre lesson screen', () => {
  describe('As LMS admin', () => {
    it('Create an account, learner,course and lesson', () => {
      adminUser = createEmail()

      //Create LMS account and upgarde to Enterprise plan
      cy.createLmsAccount(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)

      //Create learner
      learnerEmail = `edappt+learner+${adminUser}`
      cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])

      //Create course and lesson
      cy.createCourseLessonAndSlide(adminUser, password, courseTitle, lessonTitle, true, true).then(
        response => {
          courseId = response.courseId
          lessonId = response.lessonId
          cy.task('setValue', { adminUser, learnerEmail, lessonId, courseId })
        }
      )
    })
  })

  describe('As a learner', () => {
    it('Check if starsettings enabled in LMS reflects in pre-lesson screen', () => {
      //Enable showstarprogress in LMS lesson via Api
      cy.task('getValue').then(value => {
        configureStarInfoForPreLessonScreen(value.adminUser, password, value.lessonId, true, false)

        //Login to learner app
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)

        cy.getByTestId('tab-content-for-you')
          .findByTestId(`CourseCard-${value.courseId}`)
          .forceClick()
        cy.getByTestId(`card-${value.lessonId}`).click()

        //assertion
        cy.contains('Earned 0 of 1 Stars').should('be.visible')

        //Enable showstaravailablity in LMS lesson via Api
        configureStarInfoForPreLessonScreen(value.adminUser, password, value.lessonId, false, false)

        //Reload the lesson page for the settings to be reflected
        cy.reload()

        //assertion
        cy.contains('In this Lesson you can earn up to 1 Stars').should('be.visible')

        //Hide stars for pre-lessom screen in LMS lesson via Api
        configureStarInfoForPreLessonScreen(value.adminUser, password, value.lessonId, true, true)

        //Reload the lesson page for the settings to be reflected
        cy.reload()

        //assertion
        cy.contains('Earned 0 of 1 Stars').should('not.exist')
        cy.contains('In this Lesson you can earn up to 1 Stars').should('not.exist')
      })
    })
  })
})
