import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'
import { registerAccountHasPreviewedInTheApp } from 'cypress/support/helper/api-helper'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const companyLogo = 'courses/courseThumbnail.jpg'

let firstName: string
let lastName: string
let accountInitial: string

describe('Feature: Register on LMS as a Student', () => {
  it('Navigate to LMS and Register', () => {
    cy.navigateTo('LMS', '', true)

    // go to login page
    getLoginPage()
  })

  it('Fill and submit registration form and land on /welcome page', () => {
    email = createEmail()
    firstName = getNameFromEmail(email).firstName
    lastName = getNameFromEmail(email).lastName
    accountInitial = firstName[0] + lastName[0]

    cy.getByName('email').type(email)
    cy.getByName('password').type(password)
    cy.getByName('firstName').type(firstName)
    cy.getByName('lastName').type(lastName)
    cy.getByName('phone').type(`+${Date.now()}`)

    cy.intercept('POST', '/register-service').as('register')
    cy.getByButtonText('Get started for FREE').click().wait('@register')

    cy.url().should('include', '/welcome')
    cy.contains('Almost done!').should('be.visible')
    cy.contains('Tell us a bit more about you and your company.').should('be.visible')
  })

  it('Fill and submit the Welcome Form and validate account avatar initials', () => {
    cy.getByName('companyName').type(`${firstName} ${lastName} Pty Ltd`)

    cy.getByTestId('company-size').click()
    cy.contains('51-100').forceClick()

    cy.getByTestId('job-title').click()
    cy.contains('Student').forceClick()

    cy.getByTestId('region').click()
    cy.contains('Asia Pacific').forceClick()

    cy.contains('Search').forceClick().type('Agriculture{enter}')

    cy.intercept('GET', '/api/onboarding/checklist/main').as('onboardingChecklist')
    cy.getByButtonText('Get started').click().wait('@onboardingChecklist')
    cy.url().should('include', 'get-started')

    cy.get('.navbar-account-user').should('contain.text', accountInitial)
  })

  describe('Complete Get Started tasks', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/onboarding/checklist/main').as('onboardingChecklist')

      cy.navigateTo('LMS')
      cy.wait('@onboardingChecklist')
      cy.url().should('include', 'get-started')
      cy.get('h1').should('contain.text', 'Get Started')
      cy.contains('Complete the tasks below to begin making the most of EdApp.').should(
        'be.visible'
      )

      cy.intercept('GET', '/api/users/invite-email-subjects').as('inviteUsers')
      cy.intercept('POST', '/api/users/invite-manual').as('inviteManually')
      cy.intercept('POST', '/api/onboarding/checklist/main/dismiss').as('dismiss')
      cy.intercept('GET', 'api/content-library/updated-courses').as('contentLibrary')
      cy.intercept('POST', '/api/courseCollections/search').as('search')
      cy.intercept('GET', '/api/accounts/registration-settings').as('registrationSettings')
      cy.intercept('PATCH', '/api/accounts/app-settings/content').as('updateAccountSettings')
    })

    it('Share EdApp with your colleagues', () => {
      cy.contains('Share EdApp with your colleagues').forceClick().wait('@inviteUsers')
      cy.url().should('include', 'get-started')

      cy.contains('Invite Users').should('exist')
      cy.contains('Send invitations by email to join your EdApp workspace.').should('be.visible')
      cy.contains(`Invite by link`).should('be.visible')
      cy.contains(`Anyone with this unique link can join your workspace as a learner.`).should(
        'be.visible'
      )
      cy.wait('@registrationSettings')
      cy.getByButtonText('Copy').should('be.enabled').and('be.visible')

      cy.getByTestId('copy-link-input')
        .invoke('val')
        .then(inviteLinkValue => {
          cy.task('setValue', { inviteLinkValue })
        })

      cy.contains('Download QR code').should('be.visible').click()
      const qrCodeFile = Cypress.config('downloadsFolder') + '/qrcode.png'
      cy.readFile(qrCodeFile).should('exist')

      cy.contains('Disable link').should('be.visible').click()

      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'Disable invite link?')
        .and(
          'contain.text',
          'Learners will no longer be able to register using this link. You can enable this link\n        again at any time.'
        )

      cy.intercept('PUT', '/api/accounts/registration-settings').as('inviteLinkUpdated')
      cy.getByButtonText('Yes, disable')
        .click()
        .wait('@inviteLinkUpdated')
        .then(res => {
          expect(res.response.body.enableRegistrationWithInviteCode).to.be.false
        })

      cy.contains('Enable link')
        .should('be.visible')
        .click()
        .wait('@inviteLinkUpdated')
        .then(res => {
          expect(res.response.body.enableRegistrationWithInviteCode).to.be.true
        })

      cy.getByButtonText('Send invitations').should('be.disabled')

      const invitedUsers: string[] = []
      cy.getByPlaceHolderText('name@domain.com').each(($el, i) => {
        const userEmail = `user${i}.${Date.now()}@gmail.com`
        cy.wrap($el).type(userEmail)
        cy.getByButtonText('Send invitations').should('be.enabled')
        invitedUsers.push(userEmail)
      })

      cy.getByTestId('checkbox').should('be.visible').and('be.checked')
      cy.contains('Email subject line')
        .siblings('input')
        .should('have.value', `You've been invited to join EdApp by ${firstName} ${lastName}`)

      cy.getByButtonText('Send invitations')
        .click()
        .wait(['@inviteManually', '@onboardingChecklist'])

      cy.contains('Your invitations have been sent!').should('be.visible')

      invitedUsers.forEach(invitedUser => {
        cy.contains(invitedUser).should('be.visible')
      })
      cy.contains('have been sent invitations via email.').should('be.visible')
      cy.getByButtonText('Invite more users').should('be.visible')
      cy.getByButtonText('Back to checklist').should('be.visible')
    })

    it('Browse our free course library', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'Get Started')

      cy.contains('1 of 6 tasks complete').should('be.visible')

      cy.contains('Browse our free course library').click().wait('@contentLibrary')

      cy.getByButtonText('Select').first().forceClick()
      cy.getByButtonText('Import (1) course').click().wait('@onboardingChecklist')

      cy.getByTestId('dialog').should('be.visible')
      cy.contains(`You've imported your first course!`).should('be.visible')

      cy.getByTestId('import-courses-greeting-dismiss').should('be.visible').click()
    })

    it('Enrol your learners', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'Get Started4')

      cy.contains('2 of 6 tasks complete').should('be.visible')

      cy.contains('Enrol your learners').click().wait('@inviteUsers')

      cy.url().should('include', 'get-started')

      cy.getByButtonText('Send invitations').should('be.disabled')

      const invitedUsers: string[] = []
      cy.getByPlaceHolderText('name@domain.com').each(($el, i) => {
        const userEmail = `user${i}.${Date.now()}@gmail.com`
        cy.wrap($el).type(userEmail)
        cy.getByButtonText('Send invitations').should('be.enabled')
        invitedUsers.push(userEmail)
      })

      cy.getByButtonText('Send invitations')
        .click()
        .wait(['@inviteManually', '@onboardingChecklist'])

      cy.contains('Your invitations have been sent!').should('be.visible')

      invitedUsers.forEach(invitedUser => {
        cy.contains(invitedUser).should('be.visible')
      })
      cy.contains('have been sent invitations via email.').should('be.visible')
      cy.getByButtonText('Invite more users').should('be.visible')
      cy.getByButtonText('Back to checklist').should('be.visible')
    })

    it('Add your company logo to your courses', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'Get Started3')

      cy.contains('3 of 6 tasks complete').should('be.visible')

      cy.contains('Add your company logo to your courses').click()
      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'Add your company logo to your courses')
        .and(
          'contain.text',
          'Did you know course branding can be fully customized? Adding a company logo is a great way to make your courses feel like your own.'
        )

      const uploadCompanyLogo = () => {
        cy.getByButtonText('Apply logo').should('be.disabled')
        cy.getByTestId('fileinput-thumbnail').should('not.exist')

        cy.intercept('POST', '**/edapp/upload').as('logoUploaded')
        cy.get('input[type=file]').should('exist').attachFile(companyLogo).wait('@logoUploaded')

        cy.getByButtonText('Apply logo').should('be.enabled')
        cy.getByTestId('fileinput-thumbnail').should('exist').and('be.visible')
      }

      uploadCompanyLogo()

      //delete company logo
      cy.getByClassNameLike('TrashIcon').forceClick()
      cy.getByTestId('fileinput-thumbnail').should('not.exist')

      //upload and apply logo
      uploadCompanyLogo()
      cy.getByButtonText('Apply logo').click().wait('@updateAccountSettings')

      cy.getByTestId('dialog')
        .and('contain.text', 'Success!')
        .and('contain.text', 'Your courses will display this logo on all lessons by default.')

      cy.getByButtonText('Go to courses').should('be.visible')
      cy.getByTestId('close-dialog-button').click()

      cy.wait('@onboardingChecklist')
      cy.contains('4 of 6 tasks complete').should('be.visible')
    })

    it('Preview on the app', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'Get Started2')

      cy.contains('4 of 6 tasks complete').should('be.visible')
      // click on "Preview on the app" on onboarding menu
      cy.contains('Preview on the app').click()
      // verify title in dialog
      cy.contains('Preview on the app').should('be.visible')
      cy.getByButtonText('Next').click()
      cy.contains(
        'Click around to explore all the features of the learner app. You can also preview all your courses exactly how your learners would!'
      ).should('be.visible')
      // verify QR Box
      cy.getByClassNameLike('QRBox').should('exist').and('be.visible')
      cy.getByButtonText('Ok, got it!').click().wait('@onboardingChecklist')

      // check "Preview on the app" checkbox via API
      registerAccountHasPreviewedInTheApp(email, password).then(() => {
        cy.reload()

        cy.navigateTo('LMS', '/get-started')
        cy.contains('5 of 6 tasks complete').should('be.visible')
      })
    })

    it('Trade in Your Training', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'Get Started1')

      cy.contains('5 of 6 tasks complete').should('be.visible')

      cy.intercept('POST', '/api/onboarding/checklist/main/TradeInYourTraining/complete').as('TiYT')
      cy.contains('Trade in Your Training').click().wait('@TiYT')

      cy.navigateTo('LMS', '/get-started')

      cy.contains('6 of 6 tasks complete').should('be.visible')
    })

    xit('Validate All tasks completed!, Dismiss Get Started page and land on Courses page', () => {
      cy.get('.navbar-status')
        .get('a[href="/get-started"]')
        .should('exist')
        .and('contain.text', 'All tasks complete!')

      cy.contains('6 of 6 tasks complete').should('be.visible')

      cy.contains('Woohoo!').should('be.visible')
      cy.contains(`You've completed all the tasks.`).should('be.visible')

      cy.getByTestId('dismiss-checklist').click().wait(['@dismiss', '@contentLibrary', '@search'])

      cy.url().should('include', 'courseware')

      cy.get('.navbar-status').get('a[href="/get-started"]').should('not.exist')
    })
  })

  describe('Test Invite Link', () => {
    it('Visit Learners app from Invite Link', () => {
      cy.task('getValue').then(value => {
        cy.log(value.inviteLinkValue)
        cy.visit(value.inviteLinkValue)
      })

      cy.contains('We just need a few extra details').should('be.visible')
      cy.getByButtonText('Create an EdApp account').should('be.disabled')

      cy.getByName('email').clearAndType(`edappt+learner+${email}`)
      cy.getByName('password').clearAndType(password)

      cy.intercept('POST', '/api/invite/register').as('register')
      cy.intercept('POST', '/api/Interactions/batch').as('batch')

      cy.getByButtonText('Create an EdApp account')
        .should('be.enabled')
        .click()
        .wait(['@register', '@batch'])

      cy.contains('You don’t have any active courses at the moment.').should('be.visible')
    })
  })
})

const MAX = 3
const getLoginPage = (numRetries = 0) => {
  cy.url().then(url => {
    console.log(url)
    if (numRetries > MAX) {
      throw new Error('Number of retries exceeded the maximum allowed threshold')
    }
    if (url.indexOf('login') > -1) {
      cy.contains('Welcome to EdApp').should('be.visible')
      cy.contains('Register today for free').click()
      cy.url().should('include', '/signup/free')
      cy.getByName('phone').should('exist').and('be.visible')
    } else {
      // logout
      cy.logOutLMS().then(() => {
        cy.reload().then(() => {
          getLoginPage(++numRetries)
        })
      })
    }
  })
}
