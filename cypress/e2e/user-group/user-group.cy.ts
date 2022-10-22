import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  userMenuItem: '#users-menu-item',
  userGroupMenu: '[href="/user-groups"]',
  userMenu: '[href="/users"]',
  newUserGroup: '[href="/v2/user-group/new"]',
  userGroupTitle: '[data-testid="user-group-name"]',
  getByTestId: (id: string) => `[data-testid="${id}"]`,
  userGroupName: (name: string) => `a:contains(${name})`,
  allUsersSelectableList: '[data-testid="selectable-list-item"]',
  selectableListItem: (label: string) => `span:contains("${label}")`,
  saveBtn: '[data-testid="user-group-save-button"]',
  selectableListSelected: '[data-testid="selectable-list-box-selected"]',
  userGroupTable: '[data-type="user-group"]',
  tableRow: (id: string) => `tbody>#${id}`,
  userId: (id: string) => `#${id}`,
  confirmButton: '.modal-content>.modal-footer>.btn-confirm',
  usersMenuItem: '#users-menu-item',
  link: (label: string) => `a:contains("${label}")`,
  deleteConfirmationText: `input[placeholder="delete"]`,
  deleteUserGroupButton: `button:contains("Delete user group")`
}

let userGroupId = ''
let userName = ''
let userId = ''

let adminEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('User Group Creation, edit, delete, assign users and courses', () => {
  describe('Scenario: Create a regular user group', () => {
    it('Create LMS Enterprise account', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
    })

    it('Navigate to the User Groups page', () => {
      cy.navigateTo('LMS')
      cy.url().should('include', '/home')

      cy.get(selectors.usersMenuItem).click().get(selectors.link('User Groups')).click()
    })

    it('Add New User Group Title as "Regression test normal group"', () => {
      cy.get(selectors.newUserGroup).click()
      cy.get(selectors.userGroupTitle).type('Regression test normal group')
    })

    it('Save and validate "Regression test normal group" shows up in "user-groups" page', () => {
      cy.intercept('POST', '/v2/user-group/*/save').as('saveUserGroup')
      cy.get(selectors.getByTestId('user-group-save-button')).click().wait('@saveUserGroup')

      cy.navigateTo('LMS', 'user-groups')
      cy.url().should('include', 'user-groups')

      cy.get(selectors.userGroupName('Regression test normal group')).should('be.visible')
    })
  })

  describe('Scenario: Assign users/managers to user group', () => {
    it('Create a user via API and navigate to User Groups page', () => {
      const email = createEmail()
      const roles = ['app-user']
      cy.createLearnerAccount(adminEmail, password, email, password, roles).then(res => {
        userId = res.body.id
      })
      userName = email

      cy.navigateTo('LMS', 'user-groups')
    })

    it('Clicking on "Regression test normal group"should re-direct to /v2/user-group', () => {
      cy.get(selectors.userGroupName('Regression test normal group')).click()
      cy.url().should('include', '/v2/user-group/')
    })

    it('Select and assign the user to user group', () => {
      cy.contains('Select the users that will be a part of this user group.')
        .parent()
        .contains(userName)
        .should('be.visible') // waiting until data is loaded inside section
        .forceClick()
    })

    it('Save the assigned user and count should be 1 in user grp page', () => {
      cy.get(selectors.getByTestId('user-group-save-button')).click()
      cy.get(selectors.selectableListSelected).should('contain.text', userName)

      // Fetch the user group id and set in cookie to use in next test
      cy.url().then(url => {
        const value = url.split('/')
        userGroupId = value[value.length - 1]
        cy.setCookie('userGroupID', userGroupId)
      })

      cy.go('back').reload().url().should('include', 'user-groups')

      cy.getCookie('userGroupID').then(id => {
        cy.get(selectors.userGroupTable).should('be.visible')
      })
    })
  })

  describe('Scenario: Check if assigned user group shows up in user page', () => {
    it('Navigate to the users page', () => {
      cy.navigateTo('LMS')
      cy.url().should('include', '/home')

      cy.get(selectors.userMenuItem).click().find(selectors.userMenu).click()
    })

    it('User group "Regression test normal group" should be linked to the user', () => {
      cy.getByTestId('cell-Groups').should('contain.text', '(1) Regression test normal group')
    })
  })

  describe('Scenario: Delete the User Group', () => {
    it('Given "Regression test normal group" should show up in "user-groups" page', () => {
      cy.navigateTo('LMS', 'user-groups')
      cy.url().should('include', 'user-groups')

      cy.get(selectors.userGroupName('Regression test normal group')).should('be.visible')
    })

    it('Click Remove, Confirm and validate user group is removed', () => {
      cy.intercept('POST', '/user-group/**/remove').as('userGroupRemoved')

      cy.getCookie('userGroupID').then(res => {
        cy.get(selectors.getByTestId(res.value)).click()
      })

      cy.get(selectors.getByTestId('dialog'))
        .should('be.visible')
        .and('contain.text', 'Are you sure you want to delete this user group?')
        .and('contain.text', 'This will delete all user group progress and data.')
        .and(
          'contain.text',
          'The user group will also be\n        removed from all analytics and leaderboards'
        )
        .and('contain.text', 'This action is irreversible.')
        .and('contain.text', 'Type delete below to confirm this action:')

      cy.get(selectors.getByTestId('dialog'))
        .get(selectors.deleteUserGroupButton)
        .should('be.disabled')
      cy.get(selectors.getByTestId('dialog')).get(selectors.deleteConfirmationText).type('delete')
      cy.get(selectors.getByTestId('dialog'))
        .get(selectors.deleteUserGroupButton)
        .should('not.be.disabled')
        .click()
        .wait('@userGroupRemoved')

      cy.get(selectors.userGroupName('Regression test normal group')).should('not.exist')
    })
  })
})
