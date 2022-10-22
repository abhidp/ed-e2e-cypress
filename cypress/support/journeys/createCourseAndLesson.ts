const selectors = {
  button: (btnLabel: string) => `button:contains(${btnLabel})`,
  titleInput: '[data-testid^=HeadingEditorTitleInput]'
}

export const createNewCourseAndLesson = () => {
  //create course
  cy.intercept({ method: 'GET', url: 'api/courses/*' }).as('courseCreated')
  cy.intercept({ method: 'PUT', url: 'api/courses/*' }).as('courseSaved')

  cy.get(selectors.button('Create course')).click().wait('@courseCreated')
  cy.get(selectors.titleInput).clearAndType('New course').wait('@courseSaved')

  //create lesson
  cy.intercept({ method: 'GET', url: '/api/course/*/lessons' }).as('lessonCreated')
  cy.intercept({ method: 'PUT', url: 'api/lessons/*' }).as('lessonUpdated')

  cy.get(selectors.button('Create lesson')).click()
  cy.getByTestId('create-lesson').click().wait('@lessonCreated')
  cy.get(selectors.titleInput).clearAndType('New lesson').wait('@lessonUpdated')
}
