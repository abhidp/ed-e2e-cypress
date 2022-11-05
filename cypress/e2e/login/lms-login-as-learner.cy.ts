import data from '../../fixtures/logins/logins.json'

const selectors = {
  message: (message: string) => `.modal:contains("${message}")`
}

const email = data.login.learner.email
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Scenario: Login to LMS as LEARNER', () => {
  before('Logout', () => {
    cy.logOutLMS()
  })

  it(` Enter Learner credentials and Sign in: Should show message: "This account doesn't have the required permissions..."`, () => {
    cy.loginLMS(email, password)
    cy.get(
      selectors.message(
        "This account doesn't have the required permissions, please check with your account owner to ensure you have admin access"
      )
    )
      .should('exist')
      .and('be.visible')
  })
})
