/* eslint-disable cypress/no-unnecessary-waiting */
import {
  deleteCertificatesTemplates,
  getCertificatesTemplates,
  getUserTokenFromHippo
} from 'cypress/support/helper/api-helper'
import { createEmail, timeDiffInHours } from 'cypress/support/helper/common-util'

const adminEmail = createEmail()
let templateId2: string
const templateTitle = `Template ${Date.now()}`
const templatePrefix = `Updated Template `
const templateTitleUpdated = `${templatePrefix}${Date.now()}`

const password = Cypress.env('COMMON_TEST_PASSWORD')

//images
const certificateBadge = 'courses/certificateBadge.png'
const certificateCover = 'courses/certificateCover.jpeg'
const certificateLogo = 'courses/certificateLogo.png'

describe('Feature: Templates 🪪 ', () => {
  beforeEach(() => {
    cy.intercept('GET', 'api/certificates?*').as('readTemplates')
    cy.intercept('GET', 'api/accounts/appFeatures').as('getAppFeatures')
    cy.intercept('PUT', 'api/accounts/appFeatures').as('updateAppFeatures')
    cy.intercept('PATCH', 'api/certificates/*').as('updateTemplate')
  })

  after('Delete templates more than 24 hours old', () => {
    getUserTokenFromHippo(adminEmail, password).then(response => {
      const token = response.body.token
      getCertificatesTemplates(token).then(response => {
        response.items.forEach((template: any) => {
          const templateTimeStamp = Number(template.templateTitle.match(/\d+/g)) //extract timestamp from template title
          //delete certificate templates more than 24 hours old
          if (timeDiffInHours(Date.now(), templateTimeStamp) > 24 && template.isDefault === false)
            // if (Date.now() - templateTimeStamp > 172800000 && template.isDefault === false)
            deleteCertificatesTemplates(template.id, token)
        })
      })
    })
  })

  it('Should go to app settings and Disable Course Completion Checkbox toggle button', () => {
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    cy.navigateTo('LMS', '/app-settings#panel-certificates').wait([
      '@getAppFeatures',
      '@readTemplates'
    ])

    // disable Course Completion Checkbox
    cy.getByTestId('course-completion-toggle').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Disable')
      .click()
      .wait('@updateAppFeatures')

    // verify
    cy.getByButtonText('Create template').should('be.disabled')

    // enable Course Completion Checkbox
    cy.getByTestId('course-completion-toggle').click()

    // verify
    cy.getByButtonText('Create template').should('be.enabled')
  })

  it('Should go to app settings and Create a template with Default settings', () => {
    cy.intercept('POST', 'api/certificates').as('createTemplate')

    cy.navigateTo('LMS', '/app-settings#panel-certificates').wait('@readTemplates')

    cy.get('td h5') // get a selector inside a table. thus we avoid 'arbitrary' wait

    // create template
    cy.getByButtonText('Create template')
      .click()
      .wait('@createTemplate')
      .then(({ response }) => {
        templateId2 = response.body.id
      })

    // update template title
    cy.getByValue('Untitled template').clearAndType(templateTitle).wait('@updateTemplate')

    // go to template grid
    cy.getByClassNameLike('StyledCrumbLink')
      .contains('Templates')
      .click()
      .url()
      .should('include', 'app-settings#panel-certificates')

    // verify
    cy.get('tbody tr').should('contain.text', `${templateTitle}`)
  })

  it('Should go to app settings and Edit newly created template', () => {
    cy.intercept('GET', `/api/certificates/${templateId2}`).as('readTemplate')

    cy.navigateTo('LMS', '/app-settings#panel-certificates').wait('@readTemplates')

    cy.get('td h5') // get a selector inside a table. thus we avoid 'arbitrary' wait

    cy.contains(templateTitle).click().wait('@readTemplate')

    // update template title, toggle button
    cy.getByValue(templateTitle).clearAndType(templateTitleUpdated).wait('@updateTemplate')

    // toggle button "Advanced Customization" switch to on
    cy.getByTestId('toggle').first().click().wait('@updateTemplate')

    // upload Images
    cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')

    cy.contains('Cover Image')
      .parent()
      .children()
      .find('[data-testid=uploadImageButton]')
      .attachFile(certificateCover)
      .wait(['@imageUploaded', '@updateTemplate'])

    cy.contains('Certificate Badge')
      .parent()
      .children()
      .find('[data-testid=uploadImageButton]')
      .attachFile(certificateBadge)
      .wait(['@imageUploaded', '@updateTemplate'])

    cy.contains('Footer Image')
      .parent()
      .children()
      .find('[data-testid=uploadImageButton]')
      .attachFile(certificateLogo)
      .wait(['@imageUploaded', '@updateTemplate'])

    // go to template grid
    cy.getByClassNameLike('StyledCrumbLink')
      .contains('Templates')
      .click()
      .url()
      .should('include', 'app-settings#panel-certificates')

    // verify
    cy.get('tbody tr').should('contain.text', `${templateTitleUpdated}`)
  })

  it('Should go to app settings and Set newly created template as Default', () => {
    cy.intercept('PATCH', `/api/certificates/${templateId2}/default`).as('setDefaultTemplate')

    cy.navigateTo('LMS', '/app-settings#panel-certificates').wait('@readTemplates')

    cy.get('td h5') // get a selector inside a table. thus we avoid 'arbitrary' wait

    // set newly created template as a default
    cy.contains(templateTitleUpdated)
      .parent()
      .find('[data-testid=certificate-actions-dropdown-button]')
      .should('be.visible')
      .click()
      .getByTestId('dropdown-item')
      .forceClick()
      .wait(['@setDefaultTemplate', '@readTemplates'])
      .wait(2000) // takes time to re-order grid (no api call)

    // verify
    cy.get('tbody tr').as('tableRows')
    cy.get('@tableRows')
      .first()
      .should('include.text', templateTitleUpdated)
      .should('include.text', 'DEFAULT')
  })

  it('Delete option for Default template should be disabled', () => {
    cy.navigateTo('LMS', '/app-settings#panel-certificates').wait('@readTemplates')

    cy.get('td h5') // get a selector inside a table. thus we avoid 'arbitrary' wait

    // delete action
    cy.contains(templateTitleUpdated)
      .parent()
      .find('[data-testid=certificate-actions-dropdown-button]')
      .should('be.visible')
      .click()
      .getByTestId('delete-option')
      .should('have.attr', 'aria-disabled', 'true')
  })
})
