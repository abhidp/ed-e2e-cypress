import data from '../../fixtures/logins/logins.json'

const selectors = {
  navBar: 'ul.nav.navbar-nav.navbar-left',
  ['Browse course library']: 'button:contains("Browse course library")',
  headingEditorInput: '[data-testid="HeadingEditorTitleInput"]',
  coursewareLesson: '[data-testid*="content-card-contents"]',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item',
  lessonSettings: 'a:contains("Lesson settings")'
}

const email = data.login.reviewer.email
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Scenario: Login to LMS as REVIEWER', () => {
  before('Logout', () => {
    cy.logOutLMS()
  })

  it('Should redirect to /home page and have access to 1 Menu item and Course Menu', () => {
    cy.loginLMS(email, password)
    cy.url().should('include', '/home')
    cy.get(selectors.navBar).children().its('length').should('eq', 1) //Facilitate menu is removed for Reviewers
    cy.get(selectors.navBar).contains('Course').should('exist')
  })

  it('Should NOT be able to edit a Course or Lesson', () => {
    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.get(selectors['Browse course library']).should('not.exist')

    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Edit')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .first()
      .click()

    cy.url().should('include', '/v2/course')

    cy.get(selectors.headingEditorInput).should('be.disabled')
    //course settings link should not exist
    cy.getByTestId('SettingsLink').should('not.exist')

    cy.get(selectors.coursewareLesson)
      .first()
      .click({ force: true })
      .get(selectors.headingEditorInput)
      .should('be.disabled')
    //Lesson settings link should not exist
    cy.get(selectors.lessonSettings).should('not.exist')
  })
})
