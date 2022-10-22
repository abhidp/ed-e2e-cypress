import {
  createEmail,
  learnersHomePageRequests,
  createInviteCode
} from 'cypress/support/helper/common-util'

const inviteCode = `${Date.now()}`
let inviteLink: string
const selectors = {
  usersMenuItem: '#users-menu-item',
  registrationLink: 'a:contains("Registration")',
  userGroupsLink: 'a:contains("User Groups")',
  enableInviteCheckbox: '[name="enable_registration_with_invite_code"]',
  createInviteCodeField: 'input[data-view="register-validation"]',
  createUserGroupButton: 'a:contains("New user group")',
  userGroupName: 'input[data-testid="user-group-name"]',
  enableUserGroupInviteCode:
    'strong:contains("Allow registration to this group with an invite code")',
  userGroupInviteField: 'textarea[data-testid="user-group-invite-code"]',
  userGroupSaveButton: 'button[data-testid="user-group-save-button"]',
  saveMsg: '#save-msg',
  registrationEmailField: '[name="email"]',
  enterInvitationCode: 'input[placeholder="Enter your invite code if provided"]',
  submitCodeButton: 'div.form-submit-btn',
  continueButton: 'button:contains("Continue")',
  coursesTitle: 'a:contains("Courses")',

  elementByTestId: (id: string) => `[data-testid="${id}"]`,
  elementById: (id: string) => `[id=${id}]`
}

// These variables `email` and `password` are reused for each scenario in the test.
// They will be used to create the user through an api journey and then
// used for the UI tests
let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

let adminUser: string

describe('Feature: Login to Learner app via invite code', () => {
  describe('Scenario: Set up tests', () => {
    it('Set up the test accounts', () => {
      email = createEmail()
      adminUser = `edappt+admin+${email}`

      cy.createLmsAccount(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)
      cy.setCookie('email', email)
      cy.setCookie('password', password)
    })
  })

  describe('Scenario: Create an invite code in LMS', () => {
    it('Goto User Registration page and enable invite codes', () => {
      cy.navigateTo('LMS', 'home')
      cy.url().should('include', 'home')

      cy.get('#users-menu-item').click()
      cy.contains('Invite Users').click()
      cy.url().should('include', '/invite')

      cy.getByButtonText('Settings').click()
      cy.url().should('include', '/settings/registration')

      cy.getByButtonText('Edit code').click()
      cy.get('#invite_code').clearAndType(createInviteCode())
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
    })
  })

  describe('Scenario: Create an invite code for a User Group in LMS', () => {
    it('Navigate to User Group and Create New user group', () => {
      cy.navigateTo('LMS')
      cy.get(selectors.usersMenuItem).click().get(selectors.userGroupsLink).click()
      cy.get(selectors.createUserGroupButton).click()
      cy.get(selectors.userGroupName).type('User group invite code')
      cy.intercept('POST', '/v2/user-group/new/save').as('saveUserGrp')
      cy.get(selectors.userGroupSaveButton).click().wait('@saveUserGrp')

      cy.contains(`Invite new users`).should('be.visible')
      cy.contains(
        `New users can register with a unique link and automatically become a member of this group.`
      ).should('be.visible')
      cy.getByButtonText('Copy').should('be.enabled').and('be.visible')

      cy.contains(`Invite new users`)
        .parent()
        .siblings()
        .find('input')
        .then(input => {
          inviteLink = input[0].defaultValue
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

      cy.intercept('PUT', '/api/usergroups/*/registration-settings').as('inviteLinkUpdated')
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

      cy.contains('Advanced settings').should('be.visible').click()
      cy.getByButtonText('Edit code').click()
      cy.get('#invite_code').clearAndType(inviteCode)
      cy.getByButtonText('Update').click()

      cy.task('setValue', { inviteCode })

      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'Previous invite link and code deactivated')
        .and(
          'contain.text',
          'Are you sure you want to update your invite code? Any previous versions of your invite link and code will be deactivated.'
        )

      cy.intercept('PUT', '/api/usergroups/*/registration-settings').as('inviteLinkUpdated')
      cy.getByButtonText('Yes, update')
        .click()
        .wait('@inviteLinkUpdated')
        .then(res => {
          expect(res.response.body.enableRegistrationWithInviteCode).to.be.true
        })
    })
  })

  describe('Scenario: Create an account in learners app using invite code', () => {
    it('Create Learner Account', () => {
      cy.navigateTo('LEARNERS_APP', '', true)
      cy.url().should('include', '#login')
      cy.contains('Register here').forceClick()
      cy.get(selectors.registrationEmailField).type(createEmail(), { force: true }).blur()
    })

    it('Enter user Invite code', () => {
      cy.task('getValue').then(value => {
        cy.get(selectors.elementById('invite-code')).type(value.inviteCode)
      })

      cy.get(selectors.continueButton).click()
    })

    it('Enter Password and Register, and should land on home page', () => {
      cy.getByTestId('password-input').type(password)

      cy.get(selectors.elementByTestId('registerButton')).should('not.be.disabled')

      cy.intercept('POST', '/api/Interactions/batch', req => {
        const visitInteraction = req.body.find((item: any) => item.type === 'visit')
        expect(visitInteraction).to.exist
      }).as('interaction')

      const register = () => cy.get(selectors.elementByTestId('registerButton')).click()
      cy.waitForMultipleRequests(
        [{ method: 'POST', route: '/api/invite/register' }, ...learnersHomePageRequests],
        register
      )

      cy.url().should('include', '#home')

      cy.wait('@interaction')
    })

    it('Course List page should be visible ', () => {
      cy.get(selectors.coursesTitle).should('exist')
    })
  })
})
