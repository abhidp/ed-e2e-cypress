const courseTitle = 'How to be a Team Player'

describe('Feature: Content Library - Import Course', () => {
  it('Login to LMS', () => {
    cy.createLmsAccount()
    cy.navigateTo('LMS')
  })

  it('Navigate to courses page', () => {
    cy.navigateTo('LMS', '/courseware')
    cy.url().should('include', 'courseware')
  })

  it('Click Content Library button', () => {
    cy.contains('Courseware').forceClick()
    cy.contains('Course Library').forceClick()
    cy.intercept('GET', '/api/content-library/sections?*').as('sections')
    cy.getByButtonText('Browse course library').click({ force: true })
    cy.getByButtonText('Import courses').should('be.visible').and('be.disabled')
  })

  it(`Should see only 1 course - "${courseTitle}"`, () => {
    cy.getByPlaceHolderText('Search by keyword').type(courseTitle)
    cy.getByTestIdLike('content-card-contents').should('have.length', 1)

    cy.contains(courseTitle).should('have.length', 1)
  })

  it('Click the first course card and validate selected state', () => {
    cy.getByTestIdLike('content-card-contents')
      .getByButtonText('Select')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()
    cy.getByTestIdLike('content-card-contents')
      .getByButtonText('Unselect')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .should('exist')
  })

  it('Should see "Import (1) course" button text', () => {
    cy.getByButtonText('Import (1) course').should('exist')
  })

  it('Click Import Selected Courses', () => {
    cy.intercept('POST', '/api/my-courses').as('mycourses')
    cy.getByButtonText('Import (1) course').click().wait('@mycourses')
  })

  it('Should see import first course modal', () => {
    cy.getByTestIdLike('mport-courses-greeting-dismiss').click()
  })

  it('Should see course card in the course list', () => {
    cy.getByTestIdLike('content-card-contents')
      .should('contain.text', courseTitle)
      .and('be.visible')
  })
})
