/* eslint-disable mocha/no-hooks-for-single-case */
/* 
  - Create a Course Collection via API
  - Delete via Frontend
*/

import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseCollectionTitle = 'ED-14932: Delete Course Collection'
let collectionId = ''

describe('Feature: Delete Course Collection', () => {
  it('Setup Accounts and create a Course Collection via API', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)
    cy.createCourseCollection(email, password, courseCollectionTitle).then(
      courseCollectionIdResponse => {
        collectionId = courseCollectionIdResponse
      }
    )
  })

  it('Goto Courses page and delete the course collection', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.get('[data-testid*="content-card-contents"]')
      .should('be.visible')
      .trigger('mouseover', { force: true })
      .get('[data-testid*="content-card-contents"] a[href="#"]')
      .click()
      .get('[data-testid*="content-card-contents"] a[href="#"]:nth-child(1)')
      .click()

    cy.getByButtonText('Cancel').click()
    cy.getByTestId('dialog').should('not.exist')

    cy.get('[data-testid*="content-card-contents"]')
      .trigger('mouseover', { force: true })
      .get('[data-testid*="content-card-contents"] a[href="#"]')
      .click()

    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Are you sure you want to delete this collection?')
      .and('contain.text', 'This will delete all collection progress and data.')
      .and('contain.text', 'The collection will also be\n        removed from all analytics')
      .and('contain.text', 'This action is irreversible.')
      .and('contain.text', 'Type delete below to confirm this action:')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete collection')
      .should('be.disabled')

    cy.getByTestId('dialog').should('be.visible').getByPlaceHolderText('delete').type('delete')

    cy.intercept('DELETE', `/api/courseCollections/${collectionId}`).as('courseDeleted')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete collection')
      .should('be.enabled')
      .click()
      .wait('@courseDeleted')

    cy.get('[data-testid*="content-card-contents"]').should('not.exist')
  })
})
