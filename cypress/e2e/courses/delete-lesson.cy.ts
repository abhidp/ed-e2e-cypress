/* eslint-disable mocha/no-hooks-for-single-case */
/* 
  - Create a Lesson via API
  - Delete via Frontend
*/

import { deleteCourseByIdFromHippo } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-14933: Delete Lesson - Course'
const lessonTitle = 'ED-14933: Delete Lesson - Lesson'

let email: string
let courseId: string
let lessonId: string

describe('Feature: Delete Lesson', () => {
  after(`Delete course`, () => {
    deleteCourseByIdFromHippo(email, password, courseId)
  })

  it('Setup Accounts and create a Course via API', () => {
    email = createEmail()

    cy.createLmsAccount(email, password)
    cy.createCourseAndLesson(email, password, courseTitle, lessonTitle, true, true).then(
      courseIdResponse => {
        courseId = courseIdResponse.courseId
        lessonId = courseIdResponse.lessonId
      }
    )
  })

  it('Goto Course page and delete the lesson', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.get('[data-testid*="content-card-contents"]')
      .should('be.visible')
      .getByButtonText('Edit')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()

    cy.getByTestId(`content-card-contents-${lessonId}`)
      .should('be.visible')
      .getByTestId('cardDeleteButton')
      .should('be.visible')
      .click()

    cy.getByButtonText('Cancel').click()
    cy.getByTestId('dialog').should('not.exist')

    cy.getByTestId(`content-card-contents-${lessonId}`).getByTestId('cardDeleteButton').click()

    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Are you sure you want to delete this lesson?')
      .and('contain.text', lessonTitle)

    cy.getByTestId('dialog').should('be.visible').getByButtonText('Delete').should('be.enabled')

    cy.intercept({ method: 'DELETE', url: `/api/lessons/${lessonId}` }).as('lessonDeleted')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete')
      .should('be.enabled')
      .click()
      .wait('@lessonDeleted')

    cy.getByTestId(`content-card-contents-${lessonId}`).should('not.exist')
  })
})
