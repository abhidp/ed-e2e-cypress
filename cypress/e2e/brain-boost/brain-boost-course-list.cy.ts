import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail = ''

const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  bbOnboardingModal: 'brain-boost-onboarding-modal',
  bbOnboardingButton: 'brain-boost-onboarding-button'
}

const courseTitle = 'ED-18494: BB course list course'
const lessonTitle = 'ED-18494: BB course list lesson'
let courseId: string

describe('Feature: Brain boost course list - As an LMS admin', () => {
  it('Cannot boost slides on Free plan', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.createCourseLessonAndSlide(adminEmail, password, courseTitle, lessonTitle).then(res => {
      courseId = res.courseId
    })
    cy.navigateTo('LMS', 'courseware#courses')
    // cy.getByTestId(selectors.courseCardLightning(courseId)).should('not.exist')
  })

  it('Should have the onboarding content which links to the plan page', () => {
    cy.navigateTo('LMS', 'courseware#brain-boost')
    cy.getByTestId(selectors.bbOnboardingModal).should('be.visible')
    cy.getByTestId(selectors.bbOnboardingModal)
      .contains('What is Brain Boost?')
      .should('be.visible')
    cy.getByTestId(selectors.bbOnboardingButton).forceClick()
    cy.url().should('include', '/subscribe/select-plan')
  })

  it('Should have the brain boost info in the courses engagement tab', () => {
    cy.upgradeToEnterprisePlan(adminEmail, password)
    cy.navigateTo('LMS', `v2/course/${courseId}/settings/engagement`)

    cy.contains('1 question slide available for boosting').should('be.visible')
  })

  it('Should show the brain boost enabled slide count on the course card', () => {
    cy.contains('Boost Slides').click()

    cy.getByTestId('slide-checkbox-0').forceClick()
    cy.contains('0 / 1 SLIDES SELECTED')
    cy.getByTestId('slide-checkbox-0').forceClick()
    cy.contains('1 / 1 SLIDES SELECTED')
    // save selection
    cy.contains('Boost (1) slide').click()
    cy.navigateTo('LMS', 'courseware#courses')
  })

  it('Should have the new boosted brain boost info in the courses engagement tab', () => {
    cy.navigateTo('LMS', `v2/course/${courseId}/settings/engagement`)

    cy.contains('View 1 boosted slide').should('be.visible')
  })

  it('Should link to the filter brain boost table', () => {
    cy.contains('View 1 boosted slide').forceClick()

    cy.url().should(
      'include',
      `courseware?courseTitle=${encodeURIComponent(courseTitle)}#brain-boost`
    )
    cy.getByPlaceHolderText('Search by title or ID').invoke('val').should('equal', courseTitle)
    cy.getByTestId('bb-table-row-0').should('be.visible').contains(courseTitle)
  })

  it('Should revert to the old brain boost info if the slide is disabled for Brain Boost', () => {
    cy.getByTestId('bb-table-row-0').should('be.visible').forceClick()

    cy.contains('1 / 1 SLIDES SELECTED')
    cy.getByTestId('slide-checkbox-0').forceClick()
    cy.contains('0 / 1 SLIDES SELECTED')
    cy.contains('Save Changes').click()

    cy.navigateTo('LMS', `v2/course/${courseId}/settings/engagement`)
    cy.contains('View 1 boosted slide').should('not.exist')
    cy.contains('1 question slide available for boosting').should('be.visible')
  })
})
