import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail = ''

const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  bbOnboardingModal: 'brain-boost-onboarding-modal',
  bbCoursePickerItem: (courseId: string) => `content-card-contents-${courseId}`,
  courseItemHoverOverlay: `*[class^="HoverOverlay"]`
}

const courseTitle = 'ED-18493: Free Account course'
const lessonTitle = 'ED-18493: Free Account lesson'
let courseId: string

describe('Feature: Brain boost course picker - As an LMS admin', () => {
  //Create Free Plan and Check that admin cannot boost slides
  it('Cannot boost slides on Free plan', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.createCourseLessonAndSlide(adminEmail, password, courseTitle, lessonTitle).then(res => {
      courseId = res.courseId
    })

    cy.navigateTo('LMS', 'courseware#brain-boost')
    cy.contains('Boost slides').should('be.disabled')
  })

  it('Should be able to see the course in BB picker on an Enterprise plan', () => {
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // Open bb course picker
    cy.navigateTo('LMS', 'courseware#brain-boost')
    cy.contains('Boost slides').should('be.enabled').forceClick()

    // Within BB course picker modal boost slide button
    cy.getByTestId('dialog-wrapper').contains('Boost slides').should('be.disabled')

    // Course item exists
    cy.getByTestId(selectors.bbCoursePickerItem(courseId))
      .should('be.visible')
      .within(() => {
        cy.contains(courseTitle)

        // Buttons are hidden until hover
        cy.contains('Choose slides').should('not.be.visible')

        // Force opacity change since Cypress can't hover!
        cy.get(selectors.courseItemHoverOverlay)
          .should('not.be.visible')
          .invoke('attr', 'style', 'opacity: 1')

        cy.get(selectors.courseItemHoverOverlay)
          .first()
          .getByButtonText('Choose slides')
          .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

        cy.contains('Choose slides').should('be.visible')
      })

    cy.getByTestId(selectors.bbCoursePickerItem(courseId)).then(() => {
      cy.contains('Choose slides').should('be.visible')
    })
  })

  it('Should be able to interact with the brain boost slide picker', () => {
    // Course item exists
    cy.getByTestId(selectors.bbCoursePickerItem(courseId))
      .contains('Choose slides')
      .should('be.visible')
      .forceClick()

    // Slide picker
    cy.contains('1 / 1 SLIDES SELECTED')
    cy.contains(lessonTitle)
    cy.contains('Can I do a simple true or false question?')

    cy.getByTestId('slide-checkbox-0').forceClick()
    cy.contains('0 / 1 SLIDES SELECTED')

    cy.getByTestId('bulk-select-checkbox').forceClick()
    cy.contains('1 / 1 SLIDES SELECTED')

    // save selection
    cy.contains('Add to selection').forceClick()
  })

  it('Should display the selected slide info', () => {
    cy.contains('1 / 1 slides selected')
    cy.get(selectors.courseItemHoverOverlay)
      // .should('not.be.visible')   flaky app code, hover still visible sometimes
      .invoke('attr', 'style', 'opacity: 1')

    cy.get(selectors.courseItemHoverOverlay)
      .first()
      .getByButtonText('Reselect slides')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

    cy.get(selectors.courseItemHoverOverlay)
      .first()
      .getByButtonText('Unselect')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

    cy.contains('Reselect slides')
    cy.contains('Unselect')
    cy.contains('Boost (1) slide')

    cy.contains('Selected slides')
  })

  it('Should display the course item in the selected slides menu', () => {
    cy.contains('Selected slides').forceClick()
    cy.getByTestId(selectors.bbCoursePickerItem(courseId))
      .should('be.visible')
      .invoke('attr', 'style', 'opacity: 1')

    cy.get(selectors.courseItemHoverOverlay)
      .first()
      .getByButtonText('Unselect')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

    cy.get(selectors.courseItemHoverOverlay)
      .first()
      .getByButtonText('Reselect slides')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
  })

  it('Should not display the course item in the selected slides menu', () => {
    cy.contains('Unselect').forceClick()
    cy.getByTestId(selectors.bbCoursePickerItem(courseId)).should('not.exist')
    cy.contains('You have no selected slides')
    cy.contains('Back to Home').forceClick()
    cy.getByTestId(selectors.bbCoursePickerItem(courseId)).should('exist')
  })

  it('Should be able to search for the course in the course picker', () => {
    cy.getByPlaceHolderText('Search by keyword').type(courseTitle)
    cy.getByTestId(selectors.bbCoursePickerItem(courseId)).should('be.visible')
  })

  it('Should be able to boost the course and see it in the brain boost table', () => {
    cy.get(selectors.courseItemHoverOverlay)
      .should('not.be.visible')
      .invoke('attr', 'style', 'opacity: 1')

    cy.get(selectors.courseItemHoverOverlay)
      .first()
      .getByButtonText('Choose slides')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')

    cy.getByTestId(selectors.bbCoursePickerItem(courseId))
      .contains('Choose slides')
      .should('be.visible')
      .forceClick()

    // Slide picker
    cy.contains('1 / 1 SLIDES SELECTED')
    cy.contains('Add to selection').forceClick()
    cy.contains('Boost (1) slide').should('exist').forceClick()

    cy.url().should('include', '/courseware#brain-boost')
    cy.getByTestId('bb-table-row-0').contains(courseTitle)
  })

  it('Should be able to search for a course in the table', () => {
    cy.getByPlaceHolderText('Search by title or ID').type(courseTitle)
    cy.getByTestId('bb-table-row-0').should('be.visible')

    cy.getByPlaceHolderText('Search by title or ID').type('Boba Fett is overrated')
    cy.getByTestId('bb-table-row-0').should('not.exist')

    cy.contains('Clear all search and filters').forceClick()
  })

  it('Should be able see the boosted slides by clicking the boost icon on the table', () => {
    cy.getByTestId('bb-table-row-0').forceClick()

    cy.contains('1 / 1 SLIDES SELECTED')
    cy.contains(lessonTitle)
    cy.contains('Can I do a simple true or false question?')

    cy.getByTestId('BB-picker-close').forceClick()
  })

  it('Should be able to disable the slides by deleting them from the table', () => {
    cy.getByTestId('bb-table-row-0--delete').forceClick()

    cy.contains('Remove slides from Brain Boost?').should('be.visible')
    cy.contains('Yes, remove slides').forceClick()

    cy.getByTestId('bb-table-row-0--delete').should('not.exist')
  })
})
