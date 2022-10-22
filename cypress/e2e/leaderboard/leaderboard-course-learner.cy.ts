import { enableLeaderboardForCourse, mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

const adminUser = createEmail()
const learnerEmail = `edappt+learner+${adminUser}`
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-leaderboard-Course'
const lessonTitle = 'ED-leaderboard-lesson'
let courseId: string
let lessonId: string
let learnerId: string

describe('Feature: Leaderboard as a Learner', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  it('Should create an LMS account, Learner, Course with lesson and complete this Course', () => {
    //Create LMS account and upgarde to Enterprise plan
    cy.createLmsAccount(adminUser, password)
    cy.upgradeToEnterprisePlan(adminUser, password)

    //Create course and lesson
    cy.createCourseLessonAndSlide(adminUser, password, courseTitle, lessonTitle, true, true).then(
      response => {
        lessonId = response.lessonId
        courseId = response.courseId
        enableLeaderboardForCourse(adminUser, password, courseId)
      }
    )
    //Create learner
    cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
      'app-user',
      'prizing-user'
    ])
      .then(learner => {
        learnerId = learner.body.id
        cy.task('setValue', { learnerId })
      })
      .then(() => {
        // complete course via POST .../api/ed-admin/complete-courses-for-users`
        cy.completeCourses(learnerId, courseId)
      })
  })

  it('As a Learner, should go to Leaderboard and check ranking', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.intercept('GET', '/api/v2/leaderBoard/instance/getAll').as('getLeaderBoard')
    // navigate to LeaderBoard
    cy.navigateTo('LEARNERS_APP', '#leaderboards').wait('@getLeaderBoard')
    cy.getByTestId('leaderboard-header-Course-list').contains(courseTitle).forceClick()

    cy.get('#ranking-my-position').should('contain', '100')
  })
})
