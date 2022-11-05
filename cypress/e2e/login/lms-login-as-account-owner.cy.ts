import data from '../../fixtures/logins/logins.json'

const email = data.login.accountOwner.email
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Scenario: Login to LMS as ACCOUNT OWNER', () => {
  before('Logout', () => {
    cy.logOutLMS()
  })

  it('Should be able to login with Account Owner credentials', () => {
    cy.loginLMS(email, password)
    cy.navigateTo('LMS')
    cy.url().should('include', '/home')
  })
})
