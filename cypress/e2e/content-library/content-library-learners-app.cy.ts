import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  leanersAppInput: (inputName: string) => `input[name="${inputName}"]`,
  libraryCourseCards: `[data-testid*="LibraryCourseCard"]`,
  courseCards: `[data-testid*="CourseCard"]`,
  elementByDataTestId: (id: string) => `[data-testid="${id}"]`,
  learnersAppLoginForm: `[data-testid="login-form"]`,
  contentLibraryButton: `[data-testid="ContentLibraryButton"]`,
  button: (text: string) => `.btn:contains("${text}")`,
  btn: (text: string) => `[data-testid=button]:contains("${text}")`
}

// unstable test. Should be written again from scratch
describe.skip('Feature: Content Library Learners App', () => {
  describe('Scenario: View content Library as Individual Learner', () => {
    it('Add the first course from Content Library as "LEARNER"', () => {
      const preventRedirect = true

      email = `edappt+learner+${createEmail()}`
      cy.createLmsAccount(email, password, 'learner', preventRedirect)
      cy.loginToLearnersAppViaUI(email, password)

      cy.get(selectors.contentLibraryButton).click()
      cy.get(selectors.elementByDataTestId('SeeAllButton')).first().click()
      cy.get(selectors.libraryCourseCards).first().forceClick()
      cy.waitForRequest('POST', '/api/my-courses', () => {
        cy.get(selectors.elementByDataTestId('AddCourseButton')).click()
      })
      cy.get(selectors.elementByDataTestId('ExitLibraryButton')).first().click()
    })

    it('Validate course was added in Course List', () => {
      cy.get(selectors.courseCards).should('have.length', 1)
      cy.logOutLearner()
    })
  })

  describe('Scenario: View content Library as Team Trainer', () => {
    it('Add the first course from Content Library as "TEAM TRAINER"', () => {
      const preventRedirect = true

      email = `trial-${createEmail()}`
      cy.createLmsAccount(email, password, 'trial', preventRedirect)
      cy.loginToLearnersAppViaUI(email, password)

      cy.get(selectors.contentLibraryButton).click()
      cy.get(selectors.elementByDataTestId('SeeAllButton')).first().click()
      cy.get(selectors.libraryCourseCards).first().forceClick()
      cy.waitForRequest('POST', '/api/my-courses', () => {
        cy.get(selectors.elementByDataTestId('AddCourseButton')).click()
      })
      cy.get(selectors.elementByDataTestId('ExitLibraryButton')).first().click()
    })

    //will be run after BUG:ED-14014 is fixed
    xit('BUG:ED-14014 - Validate course was added in Course List', () => {
      cy.get(selectors.courseCards).should('have.length', 1)
    })
  })
})
