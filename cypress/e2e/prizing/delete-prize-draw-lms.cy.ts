import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const prizeDrawTitle = 'ED-13694: Delete a Prize Draw'
let prizeDrawId = ''

describe('Feature: Delete a Prize Draw', () => {
  it('Create a Prize draw via API', () => {
    email = createEmail()

    cy.createLmsAccount(email, password)
    cy.upgradeToEnterprisePlan(email, password)
    cy.createPrizeDraw(email, password, {
      name: prizeDrawTitle,
      gameType: 'chance'
    }).then(response => {
      prizeDrawId = `${response}`
    })
  })

  it('Delete the Prize Draw', () => {
    cy.navigateTo('LMS', 'draws')

    cy.get(`#${prizeDrawId}`).should('be.visible').and('contain.text', prizeDrawTitle)
    const deleteConfirmationText = `Are you sure you want to remove the draw ${prizeDrawTitle}?`

    cy.get(`#${prizeDrawId}`)
      .find('[title="Remove draw"]')
      .should('have.attr', 'data-href', `/draw/${prizeDrawId}/remove`)
      .and('have.attr', 'to-remove', `#${prizeDrawId}`)
      .and('have.attr', 'confirmation', deleteConfirmationText)
      .and('contain.text', 'Remove')
      .click()

    cy.getByClassNameLike('modal-content').should('be.visible')
    cy.get('.modal-body').get('h3').should('contain.text', 'Remove draw')
    cy.get('.modal-body').should('contain.text', deleteConfirmationText)
    cy.get('.modal-footer').should('contain.text', 'Confirm').and('contain.text', 'Cancel')

    cy.contains('Cancel').click()
    cy.getByClassNameLike('modal-content').should('not.be.visible')

    cy.get(`#${prizeDrawId}`).contains('Remove').click()

    cy.intercept('POST', `/draw/${prizeDrawId}/remove`).as('prizeDeleted')
    cy.contains('Confirm')
      .then($el => {
        $el.click()
      })
      .wait('@prizeDeleted')

    cy.get(`#${prizeDrawId}`).should('not.exist')
  })
})
