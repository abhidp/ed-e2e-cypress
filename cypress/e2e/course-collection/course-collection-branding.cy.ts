/*
  Create a Course Collection via API
  - Add In-App Branding by uploading Course Images
  - Add Custom CSS
  - Learner logs in the app and views the Branding
*/

import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseCollectionTitle = 'ED-13727 Course Collection Branding'
const courseTitle = 'ED-13727 Course 1'
const lessonTitle = 'ED-13727 Lesson 1'

const brandingCoverImage = 'courses/courseCover.jpg'

describe('Feature: Create Course Collection and Apply Branding', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  describe('Scenario: LMS admin applies branding to course collection', () => {
    let courseCollectionId: string
    let courseId: string
    let coverImgUrl: string

    it('Setup accounts and create course collection', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)
      cy.createCourseCollection(adminEmail, password, courseCollectionTitle).then(id => {
        return (courseCollectionId = `${id}`)
      })

      cy.createCourseLessonAndSlide(
        adminEmail,
        password,
        courseTitle,
        lessonTitle,
        true,
        true
      ).then(response => {
        cy.addCoursesToCollection(adminEmail, password, courseCollectionId, response.courseId)
        courseId = response.courseId
      })

      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail })
    })

    beforeEach('Define Network Calls for backend responses', () => {
      cy.intercept({ method: 'PUT', url: 'api/courseCollections/*' }).as('courseSaved')
    })

    it('Navigate to Branding page and upload images', () => {
      cy.navigateTo('LMS', `/v2/course-collection/${courseCollectionId}`)
      cy.getByTestId('SettingsLink').click({ force: true })
      cy.getByTestId('branding').click()
      cy.url().should('include', 'settings/branding')

      cy.getByTestId('brandingCoverImgSection')
        .find('[data-testid=uploadImageButton]')
        .should('exist')
        .attachFile(brandingCoverImage)
        .wait('@courseSaved')

      cy.getByTestId('brandingCoverImgSection').find('[data-testid=removeButton]').should('exist')
      cy.getByTestId('cover-image-preview')
        .find('img')
        .invoke('attr', 'src')
        .then(url => {
          coverImgUrl = url
          cy.task('setValue', { courseCollectionId, courseId, coverImgUrl })
        })
    })
  })

  describe('Scenario: As Learner, View the Course Collection', () => {
    it('Open the Collection and view the branding images', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)

        // navigate to library tab and wait for animation to finish
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.getByTestId('tab-label-library').should('be.visible').click({ force: true }).wait(500)

        const courseCard = `CourseCollectionCard-${value.courseCollectionId}`
        const backgroundImgUrl = value.coverImgUrl

        cy.getByTestId(courseCard)
          .find('[data-testid=branding-image]')
          .should('have.css', 'background-image', `url("${backgroundImgUrl}")`)
      })

      cy.contains(courseCollectionTitle).click()
      cy.url().should('include', `#course-collection`)

      cy.task('getValue').then(value => {
        cy.getByClassNameLike('CoverImage-sc').should('have.attr', 'src', `${value.coverImgUrl}`)
      })

      cy.contains(courseTitle).should('be.visible').click({ force: true })
      cy.contains(lessonTitle).should('be.visible').click({ force: true })

      cy.getByTestId('start-lesson').first().click({ force: true })
      cy.url().should('include', '#lesson')
    })
  })
})
