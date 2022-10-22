describe('Feature: Register from edapp.com', () => {
  it('Sign up from website pricing page', () => {
    cy.navigateTo('WEBSITE', 'pricing')
    cy.url().should('include', 'pricing')
    cy.get('[href="/signup/free"]').first().forceClick()

    cy.url().should('include', '/signup/free')
  })
})

describe('Scenario: Sign up to educate all', () => {
  it('Navigate to Educate-All page and SignUp / Join the Mission', () => {
    cy.visit(`${Cypress.env('WEBSITE')}/signup/educate-all/`)
    cy.url().should('include', 'educate-all')

    cy.getByButtonText('Get started for FREE').should('be.visible')
  })

  it('Navigate to educate all typeform', () => {
    cy.visit('https://auditor.typeform.com/to/WPNVeTaj')
    cy.contains('Join the #EducateAll mission').should('be.visible')
  })
})
