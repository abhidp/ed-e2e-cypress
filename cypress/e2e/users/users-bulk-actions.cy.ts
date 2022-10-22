import { createEmail, createName } from 'cypress/support/helper/common-util'
import {
  mockFeatureFlags,
  addUserToUserGroupPublicApiFromHippo
} from 'cypress/support/helper/api-helper'

let adminEmail: string
let learnerEmailA: string
let learnerIdA: string
let learnerEmailB: string
let learnerIdB: string
let userGroupName: string
let userGroupName2: string
let userGroupId2: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Users Bulk Actions 👥 ', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'enable-bulk-delete-users', value: true }])
    cy.intercept('POST', '/api/users/user-list').as('getUsers')
  })

  it('Should create an LMS account, learners, user group', () => {
    // create admin -> upgrade to Enterprise
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create learners
    learnerEmailA = `a+learner+${adminEmail}`
    learnerEmailB = `b+learner+${adminEmail}`

    cy.createLearnerAccount(adminEmail, password, learnerEmailA, password, ['app-user']).then(
      learner => {
        learnerIdA = learner.body.id
        cy.task('setValue', { learnerIdA })
      }
    )

    cy.createLearnerAccount(adminEmail, password, learnerEmailB, password, ['app-user']).then(
      learner => {
        learnerIdB = learner.body.id
        cy.task('setValue', { learnerIdB })
      }
    )

    // create user group
    userGroupName = createName()
    userGroupName2 = createName()
    cy.createUserGroupPublicApi(adminEmail, password, userGroupName)
    cy.createUserGroupPublicApi(adminEmail, password, userGroupName2)
      .then(response => {
        userGroupId2 = response.body.id
      })
      .then(() => {
        // add user to the user group
        addUserToUserGroupPublicApiFromHippo(adminEmail, password, userGroupId2, learnerIdA)
      })
  })

  it('Should navigate to users and Bulk Add/replace User Groups', () => {
    cy.navigateTo('LMS', '/users').wait('@getUsers')

    // User group grid
    cy.getByPlaceHolderText('Search users').type(learnerEmailB)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
    cy.get('tbody tr').should('have.lengthOf', 1)
    cy.get('thead').find('[data-testid=checkbox-label]').click()
    cy.getByTestId('open-bulk-actions-button').click()
    cy.getByTestId('assign-user-groups-option').click().wait('@getUsers')

    // User secondary search_Clear all
    cy.getByTestId('bulk-assign-user-groups-modal').contains('Clear all').click().wait('@getUsers')

    // first modal
    cy.getByTestId('bulk-assign-user-groups-modal')
      .should('be.visible')
      .getByTestId('searchable-list-input')
      .click()
      .type(learnerEmailA)
      .wait('@getUsers')
    cy.getByClassNameLike('ed-select__option').contains(learnerEmailA).click().wait('@getUsers')
    cy.getByClassNameLike('SelectedOption').contains(learnerEmailA)
    cy.contains('1 user selected')
    cy.getByButtonText('Next').click()

    // second modal
    cy.intercept('GET', '/api/usergroups/excluding-collections?*').as('getUserGroups')
    cy.getByTestId('bulk-assign-user-groups-modal').should('be.visible')
    cy.contains('Assign user groups to selected users')
    cy.getByTestId('searchable-list-input').click().type(userGroupName).wait('@getUserGroups')
    cy.getByClassNameLike('ed-select__option').contains(userGroupName).click()
    cy.getByClassNameLike('SelectedOption').contains(userGroupName)
    cy.getByButtonText('Next').click()

    // third modal_Add user group
    cy.getByClassNameLike('RadioIcon').first().click()
    cy.intercept('POST', `/api/users/assign-user-groups`).as('postAssignUserGroups')
    cy.getByButtonText('Assign user groups')
      .should('be.visible')
      .click()
      .wait('@postAssignUserGroups')

    // fourth modal
    cy.contains('Continue').should('be.visible').click().wait('@getUsers')

    // assertion
    cy.getByPlaceHolderText('Search users').clearAndType(learnerEmailA)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
    cy.getByTestId('cell-Groups').should('contain.text', '(2)')
    cy.getByTestId('cell-Groups').should('contain.text', `${userGroupName2}`)
    cy.getByTestId('cell-Groups').should('contain.text', `${userGroupName}`)

    // clear search by cross button
    cy.getByTestId('clear-input-icon').click().wait('@getUsers')
    cy.get('tbody tr').should('have.lengthOf', 3)

    // select all
    cy.get('thead').find('[data-testid=checkbox-label]').click()
    cy.getByTestId('open-bulk-actions-button').click()
    cy.getByTestId('assign-user-groups-option').click().wait('@getUsers')

    // first modal
    cy.getByTestId('bulk-assign-user-groups-modal').should('be.visible')
    cy.contains('3 users selected')
    cy.getByButtonText('Next').click()

    // second modal
    cy.getByTestId('bulk-assign-user-groups-modal').should('be.visible')
    cy.contains('Assign user groups to selected users')
    cy.getByTestId('searchable-list-input').click().type(userGroupName).wait('@getUserGroups')
    cy.getByClassNameLike('ed-select__option').contains(userGroupName).click()
    cy.getByClassNameLike('SelectedOption').contains(userGroupName)
    cy.getByButtonText('Next').click()

    // third modal_Replace user group
    cy.getByClassNameLike('RadioIcon').last().click()
    cy.getByButtonText('Assign user groups')
      .should('be.visible')
      .click()
      .wait('@postAssignUserGroups')

    // fourth modal
    cy.contains('Continue').should('be.visible').click().wait('@getUsers')

    // assertion
    cy.getByPlaceHolderText('Search users').type(learnerEmailA)
    cy.getByTestId('search-button').click().wait('@getUsers')
    cy.getByTestId('cell-Groups').should('contain.text', `(1) ${userGroupName}`)
  })

  it('Should navigate to users and Bulk Delete Users', () => {
    cy.navigateTo('LMS', '/users').wait('@getUsers')

    // clear all
    cy.get('thead').find('[data-testid=checkbox-label]').click()
    cy.getByButtonText('Clear all').click()

    // delete
    cy.get('thead').find('[data-testid=checkbox-label]').click()
    cy.getByButtonText('Delete').click()

    cy.intercept('DELETE', `/api/users/bulk`).as('deleteUsersBulk')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByPlaceHolderText('delete')
      .type('delete')
      .getByButtonText('Delete user')
      .click()
      .wait('@deleteUsersBulk')

    cy.getByTestId('bulk-delete-success').should('be.visible')
    cy.contains('Users(s) deleted').should('be.visible')
    cy.contains('Continue').should('be.visible').click().wait('@getUsers')

    cy.get('tbody tr').should('have.lengthOf', 1)
  })
})
