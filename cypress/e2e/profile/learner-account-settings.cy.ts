import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let linkedLearnerEmail: string
let newPassword: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  profileTab: '[href="#profile"]',
  accountSettingsButton: '[href="#account-settings"]',
  nameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  currentPasswordInput: 'input[name="current-password"]',
  newPasswordInput: 'input[name="new-password"]',
  confirmNewPasswordInput: 'input[name="confirm-new-password"]'
}

describe('As Learner, on Account Settings Page', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: 'api/users/sync' }).as('userDetail')
    cy.intercept({ method: 'GET', url: 'api/custom-achievements/sync' }).as(
      'achievementsListFetched'
    )
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'POST', url: '/api/accounts/link-account' }).as('linkAccount')
    cy.intercept({ method: 'POST', url: '/api/switch-account' }).as('switchAccount')
    cy.intercept({ method: 'POST', url: '/api/users/changePassword' }).as('changePassword')
    cy.intercept({ method: 'POST', url: '/api/Interactions/batch' }).as('batchInteractions')
  })
  it('Can navigate to account settings page through profile page', () => {
    //create admin and learner account
    adminEmail = createEmail()
    learnerEmail = `edappt+learner+${adminEmail}`
    linkedLearnerEmail = `linked+learner+${adminEmail}`
    cy.createLearnerViaApi(learnerEmail, password, ['app-user'])
    cy.createLearnerViaApi(linkedLearnerEmail, password, ['app-user'])

    //login to UI and navigate to profile page
    cy.loginToLearnersAppViaUI(learnerEmail, password)
    cy.url().should('include', '#home')
    cy.get(selectors.profileTab).click().wait('@achievementsListFetched')
    cy.get(selectors.accountSettingsButton).click().wait('@userDetail')
    cy.url().should('include', '#account-setting')
  })

  it('Can view link an account and change password buttons', () => {
    cy.contains('Link an account').should('be.visible')
    cy.contains('Change password').should('be.visible')
    cy.contains('Switch accounts').should('not.exist')
  })

  it('Can link an account', () => {
    cy.contains('Link an account').click()
    cy.contains('Link accounts').should('be.visible')
    cy.contains('Log in to another account to enable fast account switching.').should('be.visible')
    cy.get(selectors.nameInput).type(linkedLearnerEmail)
    cy.get(selectors.passwordInput).last().type(password)
    cy.getByButtonText('Link this account').click().wait('@linkAccount')
    cy.url().should('include', '#account-settings')
  })

  xit('Can switch accounts if account is linked', () => {
    cy.contains('Switch accounts').should('be.visible')
    cy.get('select')
      .select(`${linkedLearnerEmail} (Content-library)`)
      .wait('@switchAccount')
      .wait('@userDetail')
      .wait('@achievementsListFetched')
  })

  xit('Can change account password', () => {
    cy.contains('Change password').click()
    cy.contains('Change password')
    cy.contains('Your password must contain at least:')
    cy.contains('8 characters')
    cy.contains('Number or special character')
    cy.contains('Uppercase letter')
    cy.contains('Lowercase letter')
    cy.getByButtonText('Confirm').should('be.disabled')

    //type in same password
    cy.get(selectors.currentPasswordInput).type(password)
    cy.get(selectors.newPasswordInput).type(password)
    cy.get(selectors.confirmNewPasswordInput).type(password)
    cy.getByButtonText('Confirm').should('be.disabled')

    newPassword = 'new' + password
    cy.get(selectors.newPasswordInput).clearAndType(newPassword)
    cy.get(selectors.confirmNewPasswordInput).clearAndType(newPassword)
    cy.getByButtonText('Confirm').should('be.enabled')
    cy.getByButtonText('Confirm').click().wait('@changePassword')
    cy.contains('Password updated successfully.').should('be.visible')
    cy.getByButtonText('Done').click()
    cy.url().should('include', '#account-settings')
    cy.getByTestId('menu-toggle').first().forceClick().wait('@achievementsListFetched')
    cy.getByButtonText('Sign out').click()
    cy.contains('Sign out')
    cy.contains('Are you sure you want to sign out?')
    cy.getByButtonText('Yes, I’m sure').click().wait('@batchInteractions')

    cy.loginToLearnersAppViaUI(linkedLearnerEmail, newPassword)
  })
})
