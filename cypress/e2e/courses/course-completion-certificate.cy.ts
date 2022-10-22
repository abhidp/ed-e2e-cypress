import { createEmail, navigateTo } from 'cypress/support/helper/common-util'
import {
  completeCourseFromHippo,
  getCertificate,
  mockFeatureFlags
} from 'cypress/support/helper/api-helper'

let adminEmail: string
let courseTitle = 'ED-22501: Course'
let lessonTitle = 'ED-22501: Lesson'
let courseId: string
let lessonId: string
let learnerId: string
let learnerEmail: string
let certificateId: string
const extraCoursePayload = {
  completionCriteria: {
    openToComplete: false,
    percentage: 100,
    lessons: [],
    milestone: 'percentage',
    certificate: {
      enabled: true
    }
  }
}

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Generate a certificate for completed course  📃 ', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'enable-learners-profile-awarded-certificates-v2', value: true }])
  })
  it('Should create an LMS account, learners and courses', () => {
    // create admin -> upgrade to Enterprise
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create learners where set first name
    learnerEmail = `a+${adminEmail}`

    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user']).then(
      learner => {
        learnerId = learner.body.id
        cy.task('setValue', { learnerId })
      }
    )

    cy.task('setValue', { adminEmail, learnerEmail })

    // create a course
    cy.createCourseAndLesson(
      adminEmail,
      password,
      courseTitle,
      lessonTitle,
      true,
      true,
      {},
      extraCoursePayload
    ).then(res => {
      courseId = res.courseId
      lessonId = res.lessonId
      cy.task('setValue', { courseId, lessonId })
    })
  })

  it('Should go to the Learner app and Complete a Course', () => {
    cy.intercept('GET', '/api/users/sync').as('sync')

    // complete a course
    cy.task('getValue').then(value => {
      cy.loginToLearnersAppViaUI(value.learnerEmail, password)
        .wait('@sync')
        .then(res => {
          learnerId = res.response.body.id
          completeCourseFromHippo(
            value.courseId,
            courseTitle,
            value.lessonId,
            lessonTitle,
            res.response.body.campusToken
          )
        })

      // confirm certificate was generated via api GET user-course-certificate/.../details
      getCertificate(value.adminEmail, password, value.courseId, value.learnerId)
    })
  })

  it('Should go to certificates page and verify completed course, download a certificate', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.intercept('GET', '/api/user-course-certificates?page=*').as('getUserCourseCertificates')

    // go to awarded-certificates and verify that url exists
    cy.navigateTo('LEARNERS_APP', '#awarded-certificates')
      .wait('@getUserCourseCertificates')
      .then(({ response }) => {
        certificateId = response.body.items[0].userCourseCertificateId

        cy.intercept('GET', `/api/user-course-certificates/${certificateId}/download-link?`).as(
          'getDownloadLink'
        )

        // check completed course
        cy.contains(courseTitle)
        cy.getByTestId('awarded-certificates-card').should('have.lengthOf', 1)

        // download a certificate
        cy.getByClassNameLike('DownloadIcon')
          .click()
          .wait('@getDownloadLink')
          .then(({ response }) => {
            expect(response.body.url).to.exist // we unable to open this url
          })
      })
  })
})
