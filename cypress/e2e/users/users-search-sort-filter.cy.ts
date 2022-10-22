import { createEmail, createName } from 'cypress/support/helper/common-util'
import { selectDateFromDatePicker } from 'cypress/support/helper/utils'
import dayjs from 'dayjs'

let adminEmail: string
let learnerEmailA: string
const firstNameA = 'Aa'
const lastNameA = 'lastName'
let learnerEmailZ: string
const firstNameZ = 'Zz'
const lastNameZ = 'lastName'
let groupId: string
let userGroupName: string

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Users 🧑‍💻 ', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/users/user-list*').as('getUsers')
  })

  it('Should create an LMS account, user group', () => {
    // create admin -> upgrade to Enterprise
    adminEmail = `e+${createEmail()}`
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create user group
    userGroupName = createName()
    cy.createUserGroupPublicApi(adminEmail, password, userGroupName).then(response => {
      groupId = response.body.id
    })
  })

  it('Should create users via Public API', () => {
    // create learners where set first name
    learnerEmailA = `a+learner+${adminEmail}`
    learnerEmailZ = `z+learner+${adminEmail}`

    // user 1 with user group
    cy.createLearnerAccount(
      adminEmail,
      password,
      learnerEmailA,
      password,
      ['account-admin', 'content-author', 'manager-analytics', 'app-user', 'prizing-user'],
      firstNameA,
      lastNameA,
      null,
      [groupId]
    ).then(learner => {
      cy.task('setValue', { learnerIdA: learner.body.id })
    })

    // user 2 with sendWelcomeEmail: true
    cy.createLearnerAccount(
      adminEmail,
      password,
      learnerEmailZ,
      password,
      ['app-user', 'prizing-user'],
      firstNameZ,
      lastNameZ,
      null,
      null,
      true
    ).then(learner => {
      cy.task('setValue', { learnerIdZ: learner.body.id })
    })
  })

  it('Should navigate to users and Search for Users', () => {
    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    // search for non-existent user
    cy.getByPlaceHolderText('Search users').type('@!#$%&')
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
    cy.contains('No results')

    // remove all search and filters
    cy.contains('Clear all search and filters').click().wait('@getUsers')
    cy.get('tbody tr').should('have.lengthOf', 3)

    // search for user
    cy.getByPlaceHolderText('Search users').type(learnerEmailA)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
    cy.contains(learnerEmailA)
    cy.get('tbody tr').should('have.lengthOf', 1)

    // clear search by cross button
    cy.getByTestId('clear-input-icon').click().wait('@getUsers')
    cy.get('tbody tr').should('have.lengthOf', 3)

    // search for User with partial match
    cy.getByPlaceHolderText('Search users').type(`learner+${adminEmail}`)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)
    cy.get('tbody tr').should('have.lengthOf', 2)
  })

  it('Should navigate to users and Verify User', () => {
    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    // search for user
    cy.getByPlaceHolderText('Search users').type(learnerEmailA)
    cy.getByTestId('search-button')
      .click()
      .wait('@getUsers')
      .its('response.statusCode')
      .should('eq', 200)

    // verify user
    cy.get('tbody tr').should('have.lengthOf', 1)
    cy.getByTestId('cell-Name').should('contain.text', learnerEmailA) // username
    cy.getByTestId('cell-Name').should('contain.text', `${firstNameA} ${lastNameA}`) // first&last name
    cy.getByTestId('cell-Groups').should('contain.text', `(1) ${userGroupName}`) // user group
    cy.getByTestId('cell-Roles').should(
      'contain.text',
      '(5) Admin, Content Author, Learner, Manager Analytics, Prizing User'
    ) // roles

    cy.getByTestId('invited-false').should('exist').and('be.visible') // invite
    cy.getByTestId('logged-in-false').should('exist').and('be.visible') // logged in
    cy.getByTestId('verified-true').should('exist').and('be.visible') // verified
  })

  it('Should navigate to users and Sort by user and date registered', () => {
    cy.navigateTo('LMS', '/v2/users') // temp URL
    cy.url().should('include', '/v2/users')

    // sort user desc
    cy.getByTestId('header-Name').click().wait('@getUsers')
    cy.getByTestId('cell-Name').first().should('contain.text', learnerEmailA) // username

    // sort user asc
    cy.getByTestId('header-Name').click().wait('@getUsers')
    cy.getByTestId('cell-Name').first().should('contain.text', learnerEmailZ)

    // sort date registered desc (most recent)
    cy.getByTestId('header-DateCreated').click().wait('@getUsers')
    cy.getByTestId('cell-Name').first().should('contain.text', learnerEmailZ)
  })

  it('Should navigate to users and Filter', () => {
    cy.intercept('GET', '/api/usergroups/excluding-collections?*').as('getUserGroups')
    cy.intercept('GET', '/api/users/get-roles?*').as('getRoles')

    cy.navigateTo('LMS', '/users')

    // filter by group
    cy.getByTestId('filters-button').click().wait(['@getUserGroups', '@getRoles'])
    cy.get('input#userGroups').forceClick().type(userGroupName).wait('@getUserGroups')
    cy.getByClassNameLike('ed-select__option').contains(userGroupName).click()
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.get('tbody tr').should('have.lengthOf', 1)

    // check cross pill
    cy.getByTestId('filters-button').click()
    cy.getByTestId('pill-clear-button').click()
    cy.getByButtonText('Apply').click()

    cy.getByTestId('filters-button').click()
    cy.getByButtonText('Reset all').click()

    cy.get('tbody tr').should('have.lengthOf', 3)

    // filter by Role
    cy.getByTestId('filters-button').click()
    cy.get('input#roles').forceClick().type('Manager Analytics').wait('@getRoles')
    cy.getByClassNameLike('ed-select__option').contains('Manager Analytics').click()
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.get('tbody tr').should('have.lengthOf', 1)

    // check cross in select container
    cy.getByTestId('filters-button').click()
    cy.getByTestId('clear-button').click()
    cy.getByButtonText('Apply').click()

    cy.get('tbody tr').should('have.lengthOf', 3)

    // filter by invitationStatus
    cy.getByTestId('filters-button').click()
    cy.get('input#invitationStatus').forceClick().type('Invited')
    cy.getByClassNameLike('ed-select__option').contains('Invited').click()
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.get('tbody tr').should('have.lengthOf', 1)

    // check Reset all
    cy.getByTestId('filters-button').click()
    cy.getByButtonText('Reset all').click()

    cy.get('tbody tr').should('have.lengthOf', 3)

    // filter by loggedInStatus
    cy.getByTestId('filters-button').click()
    cy.get('input#loggedInStatus').forceClick().type('Has logged in')
    cy.getByClassNameLike('ed-select__option').contains('Has logged in').click()
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.contains('No results')

    // check Reset all
    cy.getByTestId('filters-button').click()
    cy.getByButtonText('Reset all').click()

    // filter by verificationStatus
    cy.getByTestId('filters-button').click()
    cy.get('input#verificationStatus').forceClick().type('Verified')
    cy.getByClassNameLike('ed-select__option').contains('Verified').click()
    cy.getByButtonText('Apply').click()

    cy.get('tbody tr').should('have.lengthOf', 3)

    // check Reset all
    cy.getByTestId('filters-button').click()
    cy.getByButtonText('Reset all').click()

    // filter by Date registered
    const beforeDay = dayjs().add(-1, 'd')

    cy.getByTestId('filters-button').click()
    cy.getByPlaceHolderText('End').click()
    cy.getByTestId('dateInput').last().click()
    selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), beforeDay)
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.contains('No results')

    // check clear date icon
    cy.getByTestId('filters-button').click()
    cy.getByTestId('clear-date-icon').click()

    cy.getByPlaceHolderText('Start').click()
    cy.getByTestId('dateInput').first().click()
    selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), beforeDay)
    cy.getByButtonText('Apply').click().wait('@getUsers')

    cy.get('tbody tr').should('have.lengthOf', 3)
  })
})
