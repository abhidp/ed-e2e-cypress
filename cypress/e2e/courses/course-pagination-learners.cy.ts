describe('Feature: Test Pagination of Courses in Learners App', () => {
  it(`Learner scrolls to the bottom of the page to see all 30 courses`, () => {
    const learnerEmail = 'qa+learner+course+pagination@edapp.com'
    const password = Cypress.env('COMMON_TEST_PASSWORD')
    const courseTitle = 'ED-9078 Course '
    const noOfCourses = 30

    cy.loginToLearnersAppViaUI(learnerEmail, password)
    cy.contains('View all').should('be.visible').click()

    cy.scrollTo('bottom', { ensureScrollable: false })

    Cypress._.times(noOfCourses).forEach(i => {
      cy.contains(`${courseTitle}${i}`).scrollIntoView().should('be.visible')
    })
  })
})
