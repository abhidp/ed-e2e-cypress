import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

let email: string
let adminEmail: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const courseTitle = 'ED-16312-Course'
const inviteCode = `${Date.now()}`
const customLogo = 'courses/courseThumbnail.jpg'
const termsAndConditions = 'I agree to the terms and conditions. https://www.edapp.com'

let customLogoUrl: string
let data: any

const selectors = {
  inputById: (id: string) => `input[id="${id}"]`,
  buttonByLabel: (label: string) => `button:contains("${label}")`
}

describe('Feature: User Registration Settings', () => {
  beforeEach(() => {
    cy.task('getValue').then(values => {
      data = values
    })
  })

  describe('LMS Admin Setup', () => {
    it('Goto User Registration Settings and enable all fields', () => {
      email = createEmail()
      adminEmail = `edappt+admin+${email}`

      email = createEmail('@gmail.com')
      learnerEmail = `edappt+learner+${email}`

      cy.createLmsAccount(adminEmail, password)
      cy.createCourse(adminEmail, password, courseTitle, true)
      cy.navigateTo('LMS', 'home')

      cy.get('#users-menu-item').click()
      cy.contains('Invite Users').click()
      cy.url().should('include', '/invite')

      cy.getByButtonText('Settings').click()
      cy.url().should('include', '/settings/registration')

      cy.intercept('POST', '/settings/registration').as('registrationSettingsSaved')

      cy.getByButtonText('Edit code').click()
      cy.get('#invite_code').clearAndType(inviteCode)
      cy.getByButtonText('Update').click()

      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'Previous invite link and code deactivated')
        .and(
          'contain.text',
          'Are you sure you want to update your invite code? Any previous versions of your invite link and code will be deactivated.'
        )

      cy.intercept('PUT', '/api/accounts/registration-settings').as('inviteLinkUpdated')
      cy.getByButtonText('Yes, update')
        .click()
        .wait('@inviteLinkUpdated')
        .then(res => {
          expect(res.response.body.enableRegistrationWithInviteCode).to.be.true
        })

      cy.getByName('needs_verification')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByName('use_custom_logo')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByTestId('uploadImageButton').attachFile(customLogo).wait('@registrationSettingsSaved')

      cy.getByTestId('fileinput-thumbnail').should('be.visible')

      cy.getByName('custom_logo_url').then($el => {
        customLogoUrl = $el.val()
        cy.task('setValue', { customLogoUrl })
      })

      cy.task('setValue', { adminEmail, learnerEmail, inviteCode })

      //Account
      cy.getByName('fields.email').should('be.checked').and('be.disabled')
      cy.getByName('fields.password').should('be.checked').and('be.disabled')

      //Personal
      cy.getByName('fields.firstname')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByName('fields.lastname')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      //Business
      cy.getByName('fields.postcodeAU')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByName('fields.postcodeUS')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByName('fields.storename')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      //Compliance
      cy.getByName('fields.compliance')
        .should('not.be.checked')
        .forceClick()
        .wait('@registrationSettingsSaved')

      cy.getByName('editableProperties.compliance.label')
        .should('contain.text', 'I agree to the terms and conditions.')
        .clearAndType(`${termsAndConditions}{Enter}`)

      cy.wait('@registrationSettingsSaved').its('response.statusCode').should('equal', 200)
    })
  })

  describe('Learner Registers but not verified', () => {
    it('Apply invite code, Register as Learner in Learners App, should NOT have access to content', () => {
      cy.navigateTo('LEARNERS_APP', '#sign-up')

      cy.getByName('email').type(data.learnerEmail)
      cy.get(selectors.inputById('invite-code')).type(data.inviteCode)

      cy.get(selectors.buttonByLabel('Continue')).click()

      const firstName = getNameFromEmail(data.learnerEmail).firstName
      const lastName = getNameFromEmail(data.learnerEmail).lastName

      cy.getByButtonText('Create an EdApp account').should('be.disabled')

      cy.getByClassNameLike('LogoImg')
        .should('be.visible')
        .and('have.attr', 'src', data.customLogoUrl)

      cy.getByName('email').should('have.attr', 'value', data.learnerEmail)
      cy.getByName('email').should('have.value', data.learnerEmail)

      cy.getByName('password').type(password)

      cy.getByPlaceHolderText('Enter your first name').type(firstName)
      cy.getByPlaceHolderText('Enter your last name').type(lastName)

      cy.getByPlaceHolderText('Enter your post code').type('4444')
      cy.getByPlaceHolderText('Enter your zip code').type('55555')
      cy.getByPlaceHolderText('Enter your store name').type(`${firstName}'s Store`)

      cy.contains(termsAndConditions).should('be.visible')

      cy.getByName('compliance').forceClick()

      cy.intercept('POST', '/api/invite/register').as('register')
      cy.intercept('POST', '/api/Interactions/batch').as('batch')

      cy.getByButtonText('Create an EdApp account')
        .should('be.enabled')
        .click()
        .wait(['@register', '@batch'])

      cy.url().should('include', '#user-not-verified')
      cy.contains(
        'Your account needs to be verified by your Admin. Please revisit within the next 24 hours to access your courses.'
      )
        .should('exist')
        .and('be.visible')
    })
  })

  describe('Admin verifies Learner', () => {
    it('Login to LMS and verify registered user', () => {
      cy.intercept('POST', '/api/users/user-list*').as('getUsers')

      cy.navigateTo('LMS', '/v2/users')

      // search for user
      cy.getByPlaceHolderText('Search users').type(learnerEmail)
      cy.getByTestId('search-button')
        .click()
        .wait('@getUsers')
        .then(() => {
          cy.get('tbody tr').should('have.lengthOf', 1)

          // verify user
          cy.intercept('PATCH', '/api/users/verify-user/*').as('userVerified')

          cy.getByTestId('user-options-button').click()
          cy.getByTestId('verify-user-option').click()
          cy.getByTestId('dialog')
            .should('be.visible')
            .getByButtonText('Verify')
            .click()
            .wait('@userVerified')
          cy.getByTestId('verified-true').should('exist').and('be.visible') // verified
        })
    })
  })

  describe('Learner verfied', () => {
    it('Learner logs in and can access content', () => {
      cy.loginToLearnersAppViaUI(data.learnerEmail, password)
      cy.getByClassNameLike('Title').should('contain.text', courseTitle)
    })
  })
})
