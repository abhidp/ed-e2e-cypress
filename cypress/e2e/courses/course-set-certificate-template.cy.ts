import { mockFeatureFlags, createTemplate } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
const courseTitle = 'ED-22499: Course'
const lessonTitle = 'ED-22499: Lesson'
const templateTitle = 'ED-22499: Template'
const defaultTemplateTitle = 'Default template'
let courseId: string
let lessonId: string
let certificateId: string
const extraCoursePayload = {
  completionCriteria: {
    openToComplete: false,
    percentage: 100,
    lessons: [],
    milestone: 'percentage',
    certificate: {
      enabled: true
    }
  }
}

const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Set certificate templates on Course Settings Level 📌 ', () => {
  it('Should create an LMS account and upgrade to Enterprise Plan', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create an extra template
    createTemplate(adminEmail, password, templateTitle).then(({ response }) => {
      certificateId = response.body.id
    })

    // create a course where certificate completion is switched to on
    cy.createCourseAndLesson(
      adminEmail,
      password,
      courseTitle,
      lessonTitle,
      true,
      true,
      {},
      extraCoursePayload
    ).then(res => {
      courseId = res.courseId
      lessonId = res.lessonId
      cy.task('setValue', { courseId, lessonId })
    })
  })

  it('Should go to courses and Verify Default Template in course settings', () => {
    cy.navigateTo('LMS', `/v2/course/${courseId}/settings/completion`)
    cy.url().should('include', '/completion')

    // verify toggle button is turned on
    cy.getByTestId('toggle-Checkbox').find('[class*="HiddenCheckbox"]').should('not.exist')

    // verify default template pre-selected
    cy.getByClassNameLike('ed-select__value-container').should('have.text', defaultTemplateTitle)
  })

  it('Should go to courses and Set a New Template in course settings', () => {
    cy.navigateTo('LMS', `/v2/course/${courseId}/settings/completion`)
    cy.url().should('include', '/completion')

    // change default template to newly created
    cy.intercept('POST', `api/certificates/courses/${certificateId}/set`).as('setCertificates')
    cy.intercept('GET', `api/certificates/courses/${courseId}`).as('getCertificates')

    cy.getByTestId('certificate-template-dropdown')
      .click()
      .find('[class*="ed-select__option"]')
      .contains(templateTitle)
      .click()
      .wait(['@setCertificates', '@getCertificates'])

    // verify newly selected template
    cy.getByClassNameLike('ed-select__value-container').should('have.text', templateTitle)
  })
})
