import { createEmail, createName } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let learnerId: string
let userGroupName: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Users 🧑‍💻 ', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/users/user-list*').as('getUsers')
    cy.intercept('POST', '/user/save').as('saveUser')
  })

  it('Should create an LMS account, user group', () => {
    // create admin -> upgrade to Enterprise
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create user group
    userGroupName = createName()
    cy.createUserGroupPublicApi(adminEmail, password, userGroupName)
  })

  it('Should navigate to users and Create User', () => {
    learnerEmail = `a+learner+${adminEmail}`

    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    cy.getByTestId('icon-button-link').click()

    cy.get('[name="appuser.name"]').click().type(learnerEmail)
    cy.get('[name="appuser.password"]').click().type(password)

    cy.getByButtonText('Save').click()
    cy.wait('@saveUser')
  })

  it('Should navigate to users and Edit User', () => {
    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    // search for user
    cy.getByPlaceHolderText('Search users').type(learnerEmail)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200) // temp delay

    // get learnerId
    cy.get('tbody tr')
      .should('have.lengthOf', 1)
      .wait('@getUsers')
      .then(({ response }) => {
        learnerId = response.body.items[0].id

        // open user's profile
        cy.getByTestId('cell-Name').click()

        // add role Admin
        cy.get('[name="roles.account-admin.assigned"]').parent().find('span').click()
        // add group
        cy.get('[name="course.usergroups"]')
          .parent()
          .find('[class="ms-container"]')
          .contains(userGroupName)
          .click()

        cy.getByButtonText('Save').click()
        cy.wait('@saveUser')

        // verify role and user group
        cy.navigateTo('LMS', `/user/${learnerId}`)

        cy.get('[name="roles.account-admin.assigned"]').should('have.attr', 'checked')
        cy.get('[name="course.usergroups"]')
          .parent()
          .find('[class="ms-selection"]')
          .should('have.contain.text', userGroupName)
      })
  })

  it('Login to learners app should work as expected', () => {
    cy.loginToLearnersApp(learnerEmail, password).then(res => {
      expect(res.status).to.equal('active')
    })
  })

  it('Should navigate to users and Delete User', () => {
    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    // search for user
    cy.getByPlaceHolderText('Search users').type(learnerEmail)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
      .then(() => {
        cy.get('tbody tr').should('have.lengthOf', 1)

        // delete user
        cy.intercept('DELETE', `/api/users/${learnerId}`).as('userDeleted')

        cy.getByTestId('user-options-button').click()
        cy.getByTestId('delete-user-option').click()
        cy.getByTestId('dialog')
          .should('be.visible')
          .getByPlaceHolderText('delete')
          .type('delete')
          .getByButtonText('Delete user')
          .click()
          .wait('@userDeleted')
        cy.contains('No results')
      })
  })
})
