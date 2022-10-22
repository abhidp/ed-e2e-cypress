import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let courseId: string
let courseCollectionId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-17147: Course'
const lessonTitle = 'ED-17147: Lesson'
const courseCollectionTitle = 'ED-17147: Course Collection'

describe('Feature: Courseware page ⛳ ', () => {
  it('Create LMS, Course and Course Collection', () => {
    adminEmail = createEmail()

    // create LMS
    cy.createLmsAccount(adminEmail, password)

    // create course with lesson
    cy.createCourseAndLesson(adminEmail, password, courseTitle, lessonTitle, true, true).then(
      res => {
        courseId = res.courseId
      }
    )

    // create course collection
    cy.createCourseCollection(adminEmail, password, courseCollectionTitle).then(
      courseCollectionIdResponse => {
        courseCollectionId = courseCollectionIdResponse
      }
    )
  })

  describe('Check Course and Course Collection cards', () => {
    it('Check Course card', () => {
      // verify title
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestId(`content-card-contents-${courseId}`)
        .should('be.visible')
        .find('[class*=Title]')
        .contains(courseTitle)

      // verify num of lessons (num=1)
      cy.getByTestId(`content-card-contents-${courseId}`).find('h5').contains('1')

      // verify status
      cy.getByTestId(`content-card-contents-${courseId}`)
        .find('[data-testid=course-status]')
        .contains('Published')

      // verify preview
      cy.getByTestId(`content-card-contents-${courseId}`)
        .find('[data-testid=preview-course-btn]')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .should('exist')
        .click()
      cy.contains('Course preview').should('exist').and('be.visible')

      // verify edit button
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestId(`content-card-contents-${courseId}`)
        .find('[data-testid=edit-course-btn]')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .should('exist')
        .click()
      cy.url().should('include', `/v2/course/${courseId}`)

      // verify duplicate functionality
      cy.navigateTo('LMS', '/courseware')

      cy.intercept({ method: 'POST', url: `/api/courses/copy` }).as('courseCopied')
      cy.intercept({ method: 'POST', url: `/api/courseCollections/search` }).as(
        'courseCollectionsSearch'
      )

      cy.getByTestId(`content-card-contents-${courseId}`).find('[class*=OptionsHIcon]').forceClick()

      cy.getByTestId(`content-card-contents-${courseId}`)
        .find('[class*=CopyIcon]')
        .forceClick()
        .wait('@courseCopied')

      cy.getByTestId('dialog').should('be.visible').and('contain.text', 'Mission accomplished!')
      cy.getByButtonText('Close').click().wait('@courseCollectionsSearch')
      cy.getByTestId('dialog').should('not.exist')

      // verify status of duplicated course
      cy.getByTestIdLike('content-card-contents')
        .first()
        .find('[data-testid=course-status]')
        .contains('Draft')

      // verify delete functionality
      cy.getByTestId(`content-card-contents-${courseId}`).find('[class*=OptionsHIcon]').forceClick()

      cy.getByTestId(`content-card-contents-${courseId}`).find('[class*=TrashIcon]').forceClick()

      cy.getByTestId('dialog')
        .should('be.visible')
        .getByPlaceHolderText('delete')
        .type('delete')
        .getByButtonText('Delete course')
        .click()
    })

    it('Check Course Collection card', () => {
      // verify title
      cy.navigateTo('LMS', '/courseware')
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .should('be.visible')
        .find('[class*=Title]')
        .contains(courseCollectionTitle)

      // verify num of courses for course Collection (num=0)
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[class*=ChaptersIcon]')
        .should('not.exist')

      // verify status of course Collection
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[data-testid=testcourse-status]')
        .should('not.exist')

      // verify preview functionality doest exist for course Collection
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[data-testid=preview-course-btn]')
        .should('not.exist')

      // verify edit functionality for Course Collection
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[data-testid=edit-course-btn]')
        .should('exist')

      // verify duplicate functionality doest exist for course Collection
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[class*=CopyIcon]')
        .should('not.exist')

      // verify delete functionality for course collection
      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .find('[class*=OptionsHIcon]')
        .forceClick()

      cy.getByTestId(`content-card-contents-${courseCollectionId}`)
        .should('be.visible')
        .find('[class*=TrashIcon]')
        .should('exist')
    })
  })
})
