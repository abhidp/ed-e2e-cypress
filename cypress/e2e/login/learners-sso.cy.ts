/* eslint-disable @typescript-eslint/no-explicit-any */
let learnersSsoLink = ''
// let options: any = {}
const ENV = Cypress.env('NODE_ENV')

let options: any = {
  username: Cypress.env(`${ENV}_SSO_USERNAME`),
  password: Cypress.env(`${ENV}_SSO_PASSWORD`),
  ssoLoginUrl: `${Cypress.env('LEARNERS_APP')}/#sso-login`,
  businessId: Cypress.env(`${ENV}_SSO_BUSINESS_ID`),
  browser: Cypress.browser
}

describe('Invalid Business ID', () => {
  it('Should not login with invalid BusinessId', () => {
    cy.navigateTo('LEARNERS_APP')
    cy.contains('Log in via SSO').click()

    cy.getByTestId('sso-login-form')
      .getByTestId('sso-login-title')
      .should('contain.text', 'Single Sign-On')

    cy.getByTestId('sso-login-form').getByPlaceHolderText('Enter your business ID').should('exist')

    cy.getByTestId('back-action').should('exist')

    cy.getByPlaceHolderText('Enter your business ID').type('wrong-sso')

    cy.intercept('POST', '/api/authentication/sso-check').as('ssoCheck')

    cy.getByTestId('sso-login-form')
      .submit()
      .wait('@ssoCheck')
      .then(ssoCheck => {
        expect(ssoCheck.response.statusCode).to.eq(404)
        expect(ssoCheck.response.body.code).to.eq('BusinessIdNotFound')
      })

    cy.contains('Incorrect business ID, please check with your organization.').should('be.visible')
  })
})

describe('Sign In to Microsoft Single Sign On', () => {
  it('Get EdApp SSO Link by SigningIn to Microsoft account', () => {
    cy.task('getSsoLink', options).then(ssoLink => {
      learnersSsoLink = `${ssoLink}`
    })
  })
})

describe('Login using EdApp SSO Link', () => {
  it('Login with EdApp SSO Link and validate correct user is Signed in, then Sign Out', () => {
    cy.visit(learnersSsoLink)
    cy.url().should('include', `${Cypress.env('LEARNERS_APP')}/#home`)

    cy.contains('My Profile').click().url().should('include', '#profile')
    cy.contains(options.username).should('be.visible')

    //sign out
    cy.getByButtonText('Sign out').forceClick()
    cy.getByButtonText('Yes, I’m sure').forceClick()
    cy.url().should('include', `${Cypress.env('LEARNERS_APP')}/#login`)
  })
})
