import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const userGroupName = 'ED-16828-UG'
const customValue = `${Date.now()}`

describe('Create a Learner with Custom Field (Dynamic User Group)', () => {
  describe('As a Super Admin', () => {
    it('Add Custom Field in App Settings', () => {
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.navigateTo('LMS', 'app-settings#panel-user-custom-fields')
      cy.getByTestId('add-dynamic-field').forceClick()

      cy.getByTestId('fieldLabel').type('Branch')
      cy.getByTestId('fieldDescription').type('Branch Name')
      cy.get('tr').find('input[type=checkbox]').forceClick()

      cy.intercept('PUT', '/api/accounts/customFields').as('customFields')
      cy.intercept('GET', '/app-settings').as('appSettings')

      cy.getByTestId('CustomFieldSaveButton').click().wait(['@customFields'])
    })

    it('Create New Dynamic User Group with the above Custom Field', () => {
      cy.navigateTo('LMS', 'v2/user-group/new')

      cy.getByPlaceHolderText('Name your user group').type(userGroupName)
      cy.contains('Dynamic User Group').forceClick()

      cy.contains('Select...').click().type('Branch{enter}')
      cy.getByClassNameLike('text-input--transparent').type(customValue).blur()

      cy.intercept('POST', '/v2/user-group/new/save').as('saveUG')
      cy.intercept('GET', '/api/usergroups/*/status').as('getUG')

      cy.getByTestId('user-group-save-button').forceClick().wait(['@saveUG', '@getUG'])
    })

    it('Create New User with custom field and verify its assgined under the above UG', () => {
      cy.navigateTo('LMS', '/user/new')

      learnerEmail = createEmail()
      cy.getByName('appuser.name').type(learnerEmail)
      cy.getByName('appuser.password').type(password)
      cy.getByName('appuser.profile.branch').type(customValue)

      cy.intercept('POST', '/user/save').as('userSaved')
      cy.get('#save').click().wait('@userSaved')

      cy.get('.ms-selection').should('contain.text', userGroupName)
    })

    it('Validate UG tag is shown under the user in /users page', () => {
      cy.navigateTo('LMS', '/v2/users')

      cy.getByTestId('cell-Groups').should('contain.text', `(1) ${userGroupName}`)
    })
  })

  describe('As a Learner', () => {
    it('Login Successfully', () => {
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', '#profile')
      cy.contains(learnerEmail).should('be.visible')
    })
  })
})
