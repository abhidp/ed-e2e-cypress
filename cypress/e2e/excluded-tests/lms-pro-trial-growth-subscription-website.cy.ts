import { createEmail } from 'cypress/support/helper/common-util'
import { fillLmsSignUpFormAndRegister } from 'cypress/support/journeys/createLmsAccount'

let adminEmail: string
const adminPassword = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Pro trial Growth plan subscription from website', () => {
  context('Plan details on Account menu dropdown', () => {
    it('Choose Growth plan from website/pricing page and register', () => {
      cy.navigateTo('WEBSITE', 'pricing')

      cy.getByTestId('growth').find(`[href='/signup/growth/']`).forceClick()

      adminEmail = createEmail()

      fillLmsSignUpFormAndRegister(adminEmail, adminPassword)
    })

    it('Verify plan details on Account badge dropdown menu', () => {
      cy.navigateTo('LMS', 'home')
      cy.getByTestId('userSettingsDropdown').forceClick()

      cy.getByClassNameLike('dropdown-menu navbar-account-initials').should(
        'not.contain.text',
        'API Details'
      )

      cy.getByClassNameLike('dropdown-menu navbar-account-initials')
        .should('contain.text', 'Your plan:  EdApp Pro Growth  (Trial)')
        .and('contain.text', 'Edapp Pro Growth')
        .and('contain.text', 'Your free trial will end in 29 days')
        .and('contain.text', 'Buy EdApp Pro now')
    })
  })

  context('Restricted features on Growth Plan', () => {
    it('App Settings page -> Dynamic UG should be disabled', () => {
      cy.navigateTo('LMS', '/app-settings#panel-user-custom-fields')
      cy.getByTestId('EnableDynamicUserGroupCheckbox').should('be.disabled')
      cy.getByTestId('EnableDynamicUserGroupCheckbox')
        .siblings()
        .should('contain.text', 'Enable Dynamic User Group')
        .and('contain.text', 'Allows creating dynamic user groups for this account.')

      cy.contains('Get More Features').should('be.visible')
      cy.contains('Upgrade your plan to enjoy even more great EdApp features').should('be.visible')
      cy.contains('Explore Plans').should('be.visible')
    })

    it('User Groups page -> Dynamic UG should be disabled', () => {
      cy.navigateTo('LMS', '/v2/user-group/new')
      cy.getByTestId('group-dynamic-radio')
        .should('be.visible')
        .and('contain.text', 'Dynamic User Group')
        .and(
          'contain.text',
          'This user group allows moving individual users in or out dynamically based on Custom Fields.'
        )
    })
  })
})
