import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Ability for Individual Learner to remove courses from catalog', () => {
  it('IL can delete course from catalog', () => {
    email = createEmail()
    cy.createLearnerViaApi(email, password, ['individual-learner'])
    cy.loginToLearnersAppViaUI(email, password)

    cy.navigateTo('LEARNERS_APP', '#content-library')

    cy.getByTestIdLike('LibraryCourseCard').first().forceClick()
    cy.url().should('include', '#content-library/course')

    cy.intercept('POST', '/api/my-courses').as('courseAdded')
    cy.getByButtonText('Add course').forceClick().wait('@courseAdded')

    cy.navigateTo('LEARNERS_APP')
    cy.getByTestId('TopRightComponentWrapper').click()
    cy.getByTestId('dropdown-item').should('be.visible')

    cy.intercept('DELETE', '/api/my-courses').as('courseDeleted')
    cy.contains('Remove').click().wait('@courseDeleted')

    cy.getByTestIdLike('CourseCard').should('not.exist')
  })
})
