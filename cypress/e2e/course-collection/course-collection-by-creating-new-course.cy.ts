/*
  Create a Course Collection by creating new course from within the collection
  - create 2 courses and publish only one
  - learner should only see the published course in the collection and not the other course
*/

import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let courseCollectionId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle1 = 'ED-13712: Course 1 Created by API (Published)'
const courseTitle2 = 'ED-13712: Course 2 Created by UI (Unpublished)'
const courseCollectionName = 'ED-13712 Course Collection by Creating New Courses'

describe('Feature: As LMS admin, Create Course Collection by creating New Courses within the collection', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  describe('Scenario: LMS admin creates course collection', () => {
    beforeEach('Define network calls', () => {
      cy.intercept({
        method: 'POST',
        url: '/api/courseCollections'
      }).as('collectionCreated')
      cy.intercept({ method: 'PUT', url: '/api/courseCollections/**' }).as('collectionSaved')
      cy.intercept({ method: 'POST', url: '/api/courses' }).as('courseCreated')
      cy.intercept({ method: 'PUT', url: '/api/courses/**' }).as('courseUpdated')
      cy.intercept({ method: 'POST', url: '/api/courses/*/publish' }).as('coursePublished')
    })

    it('Setup accounts and create courses', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.createCourse(adminEmail, password, courseTitle1, true)

      cy.createLearnerAccount(adminEmail, password, `edappt+learner+${adminEmail}`, password, [
        'app-user'
      ])
      cy.setCookie('email', learnerEmail)
    })

    it(`Validate course: ${courseTitle1} is already present in Courses page`, () => {
      cy.navigateTo('LMS', '/courseware')

      cy.get('[data-testid*="content-card-contents"]')
        .should('be.visible')
        .and('contain.text', courseTitle1)
    })

    it('Create collection', () => {
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestId('createCourseDropdownMenu').forceClick()
      cy.contains('Create a collection')
        .should('be.visible')
        .forceClick()
        .wait('@collectionCreated')
        .then(({ response }) => {
          courseCollectionId = response.body
        })

      cy.url().should('include', '/v2/course-collection')

      cy.getByValue('Untitled course collection')
        .clearAndType(courseCollectionName)
        .wait('@collectionSaved')
    })

    it('Create a new course in the Collection and select all courses in Courses tab', () => {
      cy.intercept(
        'GET',
        `api/courseCollections/${courseCollectionId}?collectionId=${courseCollectionId}`
      ).as('getCourseCollections')
      cy.intercept('POST', `api/courseCollections/search`).as('searchCourses')

      cy.intercept(
        'GET',
        `api/courseCollections/${courseCollectionId}/courses**&unSelected=false`
      ).as('fetchSelectedCourses')
      cy.intercept(
        'GET',
        `api/courseCollections/${courseCollectionId}/courses**&unSelected=true`
      ).as('fetchUnselectedCourses')

      // open newly created Collection
      cy.navigateTo('LMS', `/v2/course-collection/${courseCollectionId}`).wait(
        '@getCourseCollections'
      )

      cy.getByButtonText('Create course').click()

      cy.getByValue('Untitled course').clearAndType(courseTitle2).wait('@courseUpdated')

      // go to Collection
      cy.get(`a:contains("${courseCollectionName}")`).click()
      cy.url().should('include', '/v2/course-collection')

      // open collection Settings on Course tab
      cy.getByTestId('SettingsLink')
        .click({ force: true })
        .wait(['@fetchSelectedCourses', '@fetchUnselectedCourses'])

      cy.url().should('include', 'settings/courses')

      cy.getByTestId('All courses').should('contain.text', courseTitle1)
      cy.getByTestId('Selected Courses').should('contain.text', courseTitle2)

      cy.contains(courseTitle1).forceClick().wait('@courseUpdated')

      cy.getByTestId('Selected Courses').should('contain.text', courseTitle1)
    })
  })

  describe('Scenario: As Learner, View the Course Collection', () => {
    it(`Course Collection should be visible with only course: ${courseTitle1}`, () => {
      cy.getCookie('email').then(email => cy.loginToLearnersAppViaUI(email.value, password))

      // navigate to library tab
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.getByTestId('tab-label-library').should('be.visible').click({ force: true }).wait(500)

      cy.contains(courseCollectionName).should('be.visible').click()
      cy.url().should('include', '#course-collection')

      cy.getByTestId('collectionTitle').should('contain.text', courseCollectionName)

      cy.contains(courseTitle2).should('not.exist')

      cy.contains(courseTitle1).should('be.visible')
    })
  })
})
