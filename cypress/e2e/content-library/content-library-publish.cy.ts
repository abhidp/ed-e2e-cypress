const selectors = {
  elementByTestId: (id: string) => `[data-testid="${id}"]`,
  elementById: (id: string) => `[id="${id}"]`,
  breadcrumbByText: (text: string) => `a:contains("${text}")`,
  edSelect: `div.ed-select__input > input`,
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item',
  saveButton: `[data-testid="SaveButton"]`
}

describe('Feature: Publish Content Library Course', () => {
  it('Create an educate all account', () => {
    cy.createFreemiumAccount()
    cy.getCookie('connect.sid').should('exist')
  })

  it('Goto LMS and create new Course and Lesson', () => {
    cy.navigateTo('LMS', '/courseware')
    cy.url().should('include', 'courseware')
    cy.createNewCourseAndLesson()
  })

  it('Add a new slide to the lesson and Save', () => {
    cy.get(selectors.elementByTestId('EditLessonContentButton')).click()
    cy.get(selectors.elementByTestId('AddSlideButton')).click()
    cy.get(selectors.elementById('comparison-compare-two')).click()
    cy.get(selectors.saveButton).click()
  })

  it('Go back to the Lesson level and Publish the Lesson', () => {
    cy.get(selectors.breadcrumbByText('New lesson')).click()
    cy.scrollTo('top')
    cy.get(selectors.elementByTestId('PublishToggle-Checkbox')).click({ force: true })
  })

  it('Go back to the Course level and Publish the Course', () => {
    cy.get(selectors.breadcrumbByText('New course')).click()
    cy.get(selectors.elementByTestId('PublishButton')).click()

    cy.getByTestId('dialog').should('exist').and('contain', 'Publish Course')

    cy.intercept('POST', 'api/courses/*/publish').as('coursePublished')
    cy.getByTestId('button').contains('Publish').click().wait('@coursePublished')

    //First publish course modal
    cy.getByTestId('dialog')
      .should('contain.text', `You've published your first course!`)
      .and(
        'contain.text',
        `There are no learners enrolled in this course, so no-one can access it. Would you like to invite learners?`
      )
    cy.getByButtonText('No, just publish it').click()

    cy.get(selectors.elementByTestId('course-status')).contains('Published', { matchCase: false })
  })
})
