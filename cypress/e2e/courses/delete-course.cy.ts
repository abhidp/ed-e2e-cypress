/* 
  - Create a Course via API
  - Delete via Frontend
*/

import { createEmail } from 'cypress/support/helper/common-util'

let email: string
let courseId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-14895: Delete Course'

describe('Feature: Delete Course', () => {
  it('Setup Accounts and create a Course via API', () => {
    email = createEmail()

    cy.createLmsAccount(email, password)
    cy.createCourse(email, password, courseTitle, true).then(courseIdResponse => {
      courseId = courseIdResponse
    })
  })

  it('Goto Courses page and delete the course', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.get(`[data-testid="content-card-contents-${courseId}"]`)
      .should('be.visible')
      .getByClassNameLike('OptionsHIcon')
      .forceClick()

    cy.get(`[data-testid="content-card-contents-${courseId}"]`)
      .should('be.visible')
      .getByClassNameLike('TrashIcon')
      .forceClick()

    cy.getByButtonText('Cancel').click()
    cy.getByTestId('dialog').should('not.exist')

    cy.get(`[data-testid="content-card-contents-${courseId}"]`)
      .should('be.visible')
      .getByClassNameLike('TrashIcon')
      .forceClick()

    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Are you sure you want to delete this course?')
      .and('contain.text', 'This will delete all course progress and data.')
      .and('contain.text', 'The course will also be\n        removed from all analytics')
      .and('contain.text', 'This action is irreversible.')
      .and('contain.text', 'Type delete below to confirm this action:')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete course')
      .should('be.disabled')

    cy.getByTestId('dialog').should('be.visible').getByPlaceHolderText('delete').type('delete')

    cy.intercept({ method: 'DELETE', url: `/api/courses/${courseId}` }).as('courseDeleted')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete course')
      .should('be.enabled')
      .click()
      .wait('@courseDeleted')

    cy.getByTestId(`content-card-contents-${courseId}`).should('not.exist')
  })
})
