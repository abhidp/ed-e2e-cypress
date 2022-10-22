import { createEmail, learnersHomePageRequests } from 'cypress/support/helper/common-util'

const selectors = {
  leanersAppInput: (inputName: string) => `input[name="${inputName}"]`,
  coursesTitle: 'a:contains("Courses")',
  starBalance: `[data-testid="star-balance-view-token-count"]`
}

// These variables `email` and `password` are reused for each scenario in the test.
// They will be used to create the user through an api journey and then
// used for the UI tests
let email: string
let adminUser: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const enterEmailLoginForm = (email: string) => {
  cy.getByName('username').clearAndType(email)

  cy.intercept('POST', '/api/users/verify').as('verify')
  cy.get('form').submit().wait('@verify')
}

const navigateToLearnerApp = () => {
  cy.navigateTo('LEARNERS_APP', '', true).url().should('include', '#login')
}

const submitLoginForm = () => {
  cy.intercept('POST', '/api/login/learner').as('login')
  cy.intercept('POST', '/api/invite/settings').as('registerSettings')
  cy.get('form').submit().wait(['@login', '@registerSettings'])
}

describe('Feature: Login to Learners App', () => {
  describe('Setup Test account', () => {
    it('Create ADMIN account', () => {
      email = createEmail()
      adminUser = `edappt+admin+${email}`

      cy.createLmsAccount(adminUser, password)
      cy.setCookie('email', email)
    })

    it('Create LEARNER account', () => {
      const userRoles = ['app-user', 'prizing-user']
      cy.createLearnerAccount(
        adminUser,
        password,
        `edappt+learner+${email}`,
        password,
        userRoles,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      )
    })

    it('Create REVIEWER account', () => {
      const userRoles = ['app-user', 'reviewer']
      cy.createLearnerAccount(
        adminUser,
        password,
        `edappt+reviewer+${email}`,
        password,
        userRoles,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      )
    })

    it('Ceate an ADMIN user', () => {
      const userRoles = ['app-user', 'account-admin']
      cy.createLearnerAccount(
        adminUser,
        password,
        `edappt+account+admin+${email}`,
        password,
        userRoles,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      )
    })
  })

  describe('Scenario: Login to Learners App as LEARNER', () => {
    it('Navigate to LEARNERS_APP and Click Sign In button', () => {
      navigateToLearnerApp()
    })

    it('Enter Learner Email address and Click Next', () => {
      enterEmailLoginForm(`edappt+learner+${email}`)
    })

    it('Type password and click Sign In button', () => {
      cy.getByName('password').clear().forceClick().type(password, { delay: 50 })

      submitLoginForm()

      cy.contains('Create Your New Password')
        .parent()
        .find('input')
        .forceClick()
        .type(password, { delay: 100 })

      cy.getByTestId('registerButton').should('not.be.disabled')

      cy.intercept('POST', '/api/Interactions/batch', req => {
        const visitInteraction = req.body.find((item: any) => item.type === 'visit')
        expect(visitInteraction).to.exist
      }).as('interaction')

      const register = () => cy.getByTestId('registerButton').click()
      cy.waitForMultipleRequests(
        [{ method: 'POST', route: '/api/invite/register' }, ...learnersHomePageRequests],
        register
      )

      cy.url().should('include', '#home')

      cy.wait('@interaction')
    })

    it('Course List and Star Bar=0 should be visible ', () => {
      cy.get(selectors.coursesTitle).should('exist')
      cy.get(selectors.starBalance).should('exist').and('contain.text', '0')
    })

    // TODO: Public API not consistent, ED-9602
    // And I should see "Star Bar" in navigation menu
  })

  describe('Scenario: Login to Learners App as REVIEWER', () => {
    it('Navigate to LEARNERS_APP and Click Sign In button', () => {
      navigateToLearnerApp()
    })

    it('Enter Reviewer Email address and Click Next', () => {
      enterEmailLoginForm(`edappt+reviewer+${email}`)
    })

    it('Type password and click Sign In button', () => {
      cy.getByName('password').clear().forceClick().type(password, { delay: 50 })

      submitLoginForm()

      cy.contains('Create Your New Password')
        .parent()
        .find('input')
        .forceClick()
        .type(password, { delay: 100 })

      cy.getByTestId('registerButton').should('not.be.disabled')

      cy.intercept('POST', '/api/Interactions/batch', req => {
        const visitInteraction = req.body.find((item: any) => item.type === 'visit')
        expect(visitInteraction).to.exist
      }).as('interaction')

      const register = () => cy.getByTestId('registerButton').click()
      cy.waitForMultipleRequests(
        [{ method: 'POST', route: '/api/invite/register' }, ...learnersHomePageRequests],
        register
      )

      cy.url().should('include', '#home')
    })

    it('Course List page should be visible ', () => {
      cy.get(selectors.coursesTitle).should('exist')
    })
  })

  describe('Scenario: Login to Learners App as ADMIN', () => {
    it('Navigate to LEARNERS_APP and Click Sign In button', () => {
      navigateToLearnerApp()
    })

    it('Enter Admin Email address and Click Next', () => {
      enterEmailLoginForm(`edappt+account+admin+${email}`)
    })

    it('Type password and click Sign In button', () => {
      cy.getByName('password').clear().forceClick().type(password, { delay: 50 })

      submitLoginForm()

      cy.contains('Create Your New Password')
        .parent()
        .find('input')
        .forceClick()
        .type(password, { delay: 100 })

      cy.getByTestId('registerButton').should('not.be.disabled')

      const register = () => cy.getByTestId('registerButton').click()
      cy.waitForMultipleRequests(
        [{ method: 'POST', route: '/api/invite/register' }, ...learnersHomePageRequests],
        register
      )

      cy.url().should('include', '#home')
    })

    it('Course List page should be visible ', () => {
      cy.get(selectors.coursesTitle).should('exist')
    })
  })
})
