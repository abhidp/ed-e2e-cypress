import data from '../../fixtures/logins/logins.json'

const selectors = {
  navBar: 'ul.nav.navbar-nav.navbar-left',
  ['Browse course library']: 'button:contains("Browse course library")',
  headingEditorInput: '[data-testid="HeadingEditorTitleInput"]',
  coursewareLesson: '[data-testid*="content-card-contents"]',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item'
}

const email = data.login.contentAuthor.email
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Scenario: Login to LMS as CONTENT AUTHOR', () => {
  before('Logout', () => {
    cy.logOutLMS()
  })

  it('Should redirect to /home page and have access to 3 Menu items and Course Menu', () => {
    cy.loginLMS(email, password)
    cy.url().should('include', '/home')
    cy.get(selectors.navBar).children().its('length').should('eq', 3)

    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.get(selectors['Browse course library']).should('exist')

    cy.get(selectors.navBar).contains('Courses').should('exist')
    cy.get(selectors.navBar).contains('Analytics').should('exist')
  })

  it('Should be able to edit a Course or Lesson', () => {
    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Edit')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()

    cy.url().should('include', '/v2/course')

    cy.get(selectors.headingEditorInput).should('not.be.disabled')

    cy.get(selectors.coursewareLesson)
      .first()
      .click({ force: true })
      .get(selectors.headingEditorInput)
      .should('not.be.disabled')
  })
})
