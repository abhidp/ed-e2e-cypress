import { createEmail } from 'cypress/support/helper/common-util'
import { fillLmsSignUpFormAndRegister } from 'cypress/support/journeys/createLmsAccount'

let adminEmail: string
const adminPassword = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Pro trial Plus plan subscription from website', () => {
  context('Plan details on Account menu dropdown', () => {
    it('Choose Plus plan from website/pricing page and register', () => {
      cy.navigateTo('WEBSITE', 'pricing')

      cy.getByTestId('plus').find(`[href='/signup/plus/']`).forceClick()

      adminEmail = createEmail()
      fillLmsSignUpFormAndRegister(adminEmail, adminPassword)
    })

    it('Verify plan details on Account badge dropdown menu', () => {
      cy.navigateTo('LMS', 'home')
      cy.getByTestId('userSettingsDropdown').forceClick()

      cy.getByClassNameLike('dropdown-menu navbar-account-initials').should(
        'contain.text',
        'API Details'
      )

      cy.getByClassNameLike('dropdown-menu navbar-account-initials')
        .should('contain.text', 'Your plan:  EdApp Pro Plus  (Trial)')
        .and('contain.text', 'Edapp Pro Plus')
        .and('contain.text', 'Your free trial will end in 29 days')
        .and('contain.text', 'Buy EdApp Pro now')
    })
  })

  context('Features on Plus Plan', () => {
    it('App Settings page -> Dynamic UG should be available', () => {
      cy.navigateTo('LMS', '/app-settings#panel-user-custom-fields')
      cy.getByTestId('EnableDynamicUserGroupCheckbox').should('be.enabled')
      cy.getByTestId('EnableDynamicUserGroupCheckbox')
        .siblings()
        .should('contain.text', 'Enable Dynamic User Group')
        .and('contain.text', 'Allows creating dynamic user groups for this account.')
    })

    it('User Groups page -> Dynamic UG should be available', () => {
      cy.navigateTo('LMS', '/v2/user-group/new')

      cy.getByTestId('group-title-dynamic')
        .should('not.be.disabled')
        .siblings()
        .should(
          'contain.text',
          'This user group allows moving individual users in or out dynamically based on Custom Fields.'
        )
    })
  })
})
