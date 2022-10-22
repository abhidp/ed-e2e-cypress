import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let learnerId: string
let updatedPassword: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Update password 🔐 ', () => {
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

  it('Should navigate to users and update password', () => {
    cy.intercept('POST', '/user/save').as('saveUser')

    cy.navigateTo('LMS', `/user/${learnerId}`)

    updatedPassword = `Password@${password}`

    cy.get('[name="appuser.password"]').click().type(updatedPassword)

    cy.getByButtonText('Save').click()
    cy.wait('@saveUser')
  })

  describe('Learner to verify updated password', () => {
    it('Login with updated password', () => {
      cy.loginToLearnersAppViaUI(learnerEmail, updatedPassword)
    })
  })
})
