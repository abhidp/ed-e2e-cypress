import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('LMS free plan has restricted features', () => {
  it('Create LMS account and verify unavailable Menu items', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)
    cy.navigateTo('LMS', 'home')

    //Try Edapp Pro button on navbar
    cy.getByTestId('explorePlansButton')
      .should('be.visible')
      .and('have.attr', 'href', '/subscribe/select-plan')
      .and('contain.text', 'Try EdApp Pro')

    //Plan details on profile pic
    cy.getByTestId('userSettingsDropdown').click()
    cy.get('.menu-account-info-plan')
      .should('be.visible')
      .and('contain.text', 'Your plan:   Free Plan')

    //Engage Tab
    const prizingUpgradeTitle = 'Stars & Automated Prizing Delivery is available on the Growth plan'
    const prizingUpgradeDescription =
      'To enable Stars & Prizing, upgrade your plan now and engage your learners by using real and instant rewards.'
    const explorePlanButton = 'Explore Plans'

    //Prize Draws
    cy.contains('Prize Draws').should('have.attr', 'href', '/draws').and('have.class', 'disabled')

    cy.navigateTo('LMS', 'draws').url().should('include', 'draws')

    cy.contains(prizingUpgradeTitle).should('be.visible')
    cy.contains(prizingUpgradeDescription).should('be.visible')
    cy.contains(explorePlanButton)
      .should('be.visible')
      .and('have.attr', 'href', '/subscribe/select-plan')

    //Prize Templates
    cy.contains('Prize Templates')
      .should('have.attr', 'href', '/prizes')
      .and('have.class', 'disabled')

    cy.navigateTo('LMS', 'prizes').url().should('include', 'prizes')

    cy.contains(prizingUpgradeTitle).should('be.visible')
    cy.contains(prizingUpgradeDescription).should('be.visible')
    cy.contains(explorePlanButton)
      .should('be.visible')
      .and('have.attr', 'href', '/subscribe/select-plan')

    //Analytics

    // BUG: https://ed-app.atlassian.net/browse/ED-16976

    cy.contains('Reports')
      .should('have.attr', 'href', '/analytics/engagement/reports')
      .and('have.class', 'disabled')

    cy.contains('Stars')
      .should('have.attr', 'href', '/analytics/stars')
      .and('have.class', 'disabled')

    cy.contains('Manager')
      .should('have.attr', 'href', '/analytics/manager-dashboard')
      .and('have.class', 'disabled')

    //Admin (not shown)
    cy.get('#admin-menu-item').should('not.exist')

    // ACCOUNT SETTINGS
    cy.contains('Single Sign-On').should('not.exist')
    cy.contains('API Details').should('not.exist')
  })

  it('App Settings -> Verify unavailable features', () => {
    // Stars & Prizing
    cy.navigateTo('LMS', 'app-settings')
    cy.contains('Stars & Prizing').should('not.exist')

    //Content Tab
    cy.navigateTo('LMS', 'app-settings#panel-content')

    cy.contains('Universal Access').should('not.exist')
    cy.contains(`Mark SCORM lessons “incomplete” on fail`).should('not.exist')

    //More tab
    cy.navigateTo('LMS', 'app-settings#panel-user-custom-fields')

    cy.getByTestId('EnableDynamicUserGroupCheckbox').should('be.disabled')

    cy.contains('Super Admin Section').should('not.exist')
    cy.contains('Hide Activity Feed').should('not.exist')
    cy.contains('Domain Name').should('not.exist')
  })
})
