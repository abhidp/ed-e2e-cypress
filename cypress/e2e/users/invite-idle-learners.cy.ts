import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let learnerId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Invite idle learners 🧑‍🎓 ', () => {
  it('Should create an LMS account, learner', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)

    learnerEmail = `edappt+learner+${adminEmail}`

    cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user']).then(
      learner => {
        learnerId = learner.body.id
        cy.task('setValue', { learnerId })
      }
    )
  })

  it('Should navigate to users and Send new invitations to idle learners', () => {
    cy.intercept('POST', '/user/save').as('saveUser')

    cy.navigateTo('LMS', '/users')

    cy.getByTestId('options-dropdown-button').click()
    cy.contains('Invite idle learners').click()

    cy.intercept('POST', '/api/users/invite-idle-learners').as('sendInviteIdleLearners')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Send new invitations to idle learners')
      .click()
      .wait('@sendInviteIdleLearners')
      .its('response.statusCode')
      .should('eq', 200)

    cy.getByButtonText('Close').click()
  })
})
