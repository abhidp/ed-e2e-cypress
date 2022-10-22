/*
  Create a Course Collection by importing existing Courses into the collection
  - create 2 courses and publish both
  - select only 1 course into the collection
  - learner should only see the selected course in the collection and not the other course
*/

import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle1 = 'ED-13711-Course-1'
const courseTitle2 = 'ED-13711-Course-2'
const courses: string[] = [courseTitle1, courseTitle2]
const courseCollectionName = 'ED-13711-Course Collection by Importing Existing Courses'

describe('Feature: As LMS admin, Create Course Collection by importing existing Courses into the collection', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  describe('Scenario: LMS admin creates course collection', () => {
    beforeEach('Define network calls', () => {
      cy.intercept('POST', '/api/courseCollections').as('collectionCreated')
      cy.intercept('PUT', '/api/courseCollections/**').as('collectionSaved')
      cy.intercept('PUT', '/api/courses/**/courseCollections').as('collectionUpdated')
    })

    it('Setup accounts and create courses', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${createEmail()}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      courses.forEach(courseTitle => {
        cy.createCourse(adminEmail, password, courseTitle, true)
      })

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.setCookie('email', learnerEmail)
    })

    it('Navigate to Courses page and create a collection', () => {
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestId('createCourseDropdownMenu').forceClick()
      cy.contains('Create a collection').should('be.visible').forceClick()
      cy.url().should('include', '/v2/course-collection')

      cy.getByValue('Untitled course collection')
        .clearAndType(courseCollectionName)
        .wait('@collectionSaved')
    })

    it('Goto Courses tab and add only one Course-1 to collection', () => {
      cy.getByTestId('SettingsLink').click({ force: true })
      cy.getByTestId('courses').click()

      cy.url().should('include', 'settings/courses')

      cy.getByTestId('All courses')
        .should('contain.text', courseTitle1)
        .and('contain.text', courseTitle2)

      cy.contains(courseTitle1).click().wait('@collectionUpdated')
      cy.getByTestId('Selected Courses').should('contain.text', courseTitle1)
    })
  })

  describe('Scenario: As Learner, View the Course Collection', () => {
    it('Course Collection should be visible with only Course-1', () => {
      cy.getCookie('email').then(email => cy.loginToLearnersAppViaUI(email.value, password))

      // navigate to browse tab since course collection is only in Browse Section
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.getByTestId('tab-label-library').should('be.visible').click({ force: true }).wait(500)

      cy.contains(courseCollectionName).should('be.visible').click()
      cy.url().should('include', '#course-collection')

      cy.getByTestId('collectionTitle').should('contain.text', courseCollectionName)

      cy.contains(courseTitle1).should('be.visible')
    })
  })
})
