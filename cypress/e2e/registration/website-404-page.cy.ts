const websiteURL = Cypress.env('WEBSITE')
const invalidLink = '/category/invalidLink'

describe('Feature: Test 404 Page and Redirect back to Library', () => {
  it('Visit an invalid link in edapp.com', () => {
    cy.intercept('GET', invalidLink).as('invalidLinkResponse')

    cy.visit(`${websiteURL}${invalidLink}`, { failOnStatusCode: false })

    cy.url().should('include', invalidLink)
    cy.title().should('equal', '404: Page not found | EdApp: The Mobile LMS')

    cy.contains('Head back to explore the Library.').should('be.visible')

    //mobile 404 static image
    cy.get('[title="Cannot find course or category"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('contain', 'cannot-find-course-or-category.png')

    //edapp.com logo
    cy.get('[title="EdApp by SafetyCulture"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('contain', 'ed-logo-long-svg.svg')

    //Back to Library button
    cy.contains('Back to Library')
      .should('be.visible')
      .and('have.attr', 'href')
      .and('contain', '/course-library')
  })

  it('Navigate to library by clicking on the Back to Library button', () => {
    cy.contains('Back to Library').click()

    cy.title().should('include', 'Course Library | EdApp Microlearning')
    cy.url().should('include', '/course-library')

    //search bar
    cy.getByPlaceHolderText('Search courses...').should('be.visible')

    //edapp logo
    cy.get('[title="EdApp LMS Home"]')
      .should('be.visible')
      .and('have.attr', 'href')
      .and('contain', '/')
  })
})
