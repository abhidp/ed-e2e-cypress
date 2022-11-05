import data from '../../fixtures/logins/logins.json'

const selectors = {
  navBar: 'ul.nav.navbar-nav.navbar-left',
  ['Browse course library']: 'button:contains("Browse course library")',
  headingEditorInput: '[data-testid="HeadingEditorTitleInput"]',
  coursewareLesson: '[data-testid*="content-card-contents"]',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item'
}

const email = data.login.accountAdmin.email
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Scenario: Login to LMS as ADMIN', () => {
  before('Logout', () => {
    cy.logOutLMS()
  })

  it('Should redirect to /courses page and have to all courses and 5 menu items', () => {
    cy.loginLMS(email, password)
    cy.navigateTo('LMS')

    cy.get(selectors.navBar).contains('Course').should('exist')
    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.url().should('include', '/courseware')
    cy.get(selectors.navBar).children().its('length').should('eq', 5)

    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.get(selectors['Browse course library']).should('exist')

    cy.get(selectors.navBar).contains('Courses').should('exist')
    cy.get(selectors.navBar).contains('Users').should('exist')
    cy.get(selectors.navBar).contains('Engage').should('exist')
    cy.get(selectors.navBar).contains('Analytics').should('exist')
  })

  it('Should be able to edit a Course but NOT Lesson', () => {
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
      .should('be.disabled')
  })
})
