/*
  Invite link on course preview:
  - create LMS user without learners 
  - Create a Course via API
  - Invite learners -> Learn more -> check hyperlink
  - Invite learners -> Copy URL -> verify registration page 
  - Invite learners -> QR code -> check downloaded file 
  - Invite learners -> Disable link -> verify that link is not accessible anymore
  - Invite learners -> Enable link -> verify that link is accessible
*/

import { createEmail } from 'cypress/support/helper/common-util'

let email: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'Invite link on course preview'

describe('Invite link on course Preview 🔗 ', () => {
  it('Setup Accounts, create Course via API, Goto Courses page and Learn more about Invite Users', () => {
    email = createEmail()

    cy.createLmsAccount(email, password)
    cy.createCourse(email, password, courseTitle, true).then(() => {
      cy.navigateTo('LMS', '/courseware')

      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Preview')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()

      cy.contains(`Invite learners`).should('be.visible').click()

      cy.contains(`Anyone with this unique link can join your workspace as a learner.`).should(
        'be.visible'
      )
      cy.getByClassNameLike('StyledLink').invoke('removeAttr', 'target').click()

      cy.url().should('include', '/invite-links')
    })
  })

  it('Goto Courses page and Download QR code', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Preview')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()
    cy.getByTestId('share-deeplink-button').click()

    cy.contains('Download QR code').should('be.visible').click()
    const fileName = 'qrcode.png'
    const filePath = `${Cypress.config('downloadsFolder')}/${fileName}`

    cy.readFile(filePath).should('exist')
  })

  it('Goto Courses page and Invite by email', () => {
    cy.navigateTo('LMS', '/courseware')

    cy.getByTestIdLike('content-card-contents')
      .first()
      .getByButtonText('Preview')
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .click()
    cy.getByTestId('share-deeplink-button').click()

    cy.contains('Invite by email').should('be.visible').click()

    cy.url().should('include', '/invite')
  })

  describe('Invite link Verification', () => {
    let linkUrl: string

    beforeEach(() => {
      cy.task('getValue').then((value: any) => {
        linkUrl = value.linkUrl
      })
    })

    it('Goto Courses page and Copy URL', () => {
      cy.navigateTo('LMS', '/courseware')

      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Preview')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()
      cy.getByTestId('share-deeplink-button').click()

      cy.getByButtonText('Copy').should('be.enabled').and('be.visible').click()
      cy.getByTestId('copy-link-input')
        .invoke('val')
        .then(copyUrl => {
          cy.task('setValue', { linkUrl: copyUrl })
        })
    })

    it('Goto copied URL and verify Registration page', () => {
      cy.visit(linkUrl)

      cy.contains(`We just need a few extra details`).should('be.visible')
      cy.contains(`from you to create your account`).should('be.visible')
      cy.contains(`Email`).should('be.visible')
      cy.contains('Create Your New Password').should('be.visible')
      cy.getByButtonText('Create an EdApp account').should('be.disabled')
    })

    it('Goto Courses page and Disable link', () => {
      cy.navigateTo('LMS', '/courseware')

      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Preview')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()
      cy.getByTestId('share-deeplink-button').click()

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
    })

    it('Goto copied URL and verify whether Link is Disabled', () => {
      cy.visit(linkUrl)

      cy.contains(`Create an EdApp account`).should('be.visible')
      cy.contains(`Log in`).should('be.visible')
    })

    it('Goto Courses page and Enable link', () => {
      cy.navigateTo('LMS', '/courseware')

      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Preview')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()
      cy.getByTestId('share-deeplink-button').click()

      cy.intercept('PUT', '/api/accounts/registration-settings').as('inviteLinkUpdated')
      cy.contains('Enable link')
        .should('be.visible')
        .click()
        .wait('@inviteLinkUpdated')
        .then(res => {
          expect(res.response.body.enableRegistrationWithInviteCode).to.be.true
        })
    })

    it('Goto copied URL and verify whether Link is Enabled', () => {
      cy.visit(linkUrl)

      cy.contains(`We just need a few extra details`).should('be.visible')
      cy.contains(`from you to create your account`).should('be.visible')
      cy.contains(`Email`).should('be.visible')
      cy.contains('Create Your New Password').should('be.visible')
      cy.getByButtonText('Create an EdApp account').should('be.disabled')
    })
  })
})
