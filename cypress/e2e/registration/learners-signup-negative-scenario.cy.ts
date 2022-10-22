describe('Feature: Organisation Learner Sign Up with Learners App', () => {
  const selectors = {
    signupView: '[data-testid="invite-code-form"]',
    formErrorOnly: '[data-testid="form-errors"]',
    formError: (error: string) => `[data-testid="form-errors"]:contains("${error}")`,
    input: (id: string) => `input[id="${id}"]`,
    button: (label: string) => `button:contains("${label}")`,
    networkError: (error: string) => `[data-testid="network-error"]:contains("${error}")`,
    networkErrorOnly: `[data-testid="network-error"]`,
    emailExists: `[data-testid="email-exists"]`,
    registerForm: '[data-testid="register-form"]'
  }

  const navigateToLearnerApp = () => {
    cy.navigateTo('LEARNERS_APP', '#sign-up', true)
    cy.url().should('include', '#sign-up')
  }

  beforeEach(() => {
    cy.intercept('POST', '/api/users/verify').as('verify')
  })

  it('Continue button enabled without email and invite code', () => {
    navigateToLearnerApp()
    cy.get(selectors.button('Continue')).should('be.enabled')
  })

  it('Invalid Email should give an error', () => {
    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('email'))
      .clearAndType('invalid-email.com')

    cy.get(selectors.formError('Email not valid.')).should('be.visible')
    cy.get(selectors.button('Continue')).should('be.enabled')
  })

  it('Email without Invite code should NOT allow to process', () => {
    navigateToLearnerApp()

    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('email'))
      .clearAndType('validEmail@validDomain.com')

    cy.get(selectors.button('Continue')).click()
    cy.get(selectors.formError('Invite code cannot be empty.')).should('be.visible')
  })

  it('Invite code without email should NOT allow to proceed', () => {
    navigateToLearnerApp()

    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('invite-code'))
      .clearAndType('random-invite-code')

    cy.get(selectors.button('Continue')).click()
    cy.get(selectors.formError('Email cannot be empty.')).should('be.visible')
  })

  it('Wrong invite code should give error', () => {
    navigateToLearnerApp()

    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('email'))
      .clearAndType('validEmail@validDomain.com')

    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('invite-code'))
      .clearAndType('wrong-invite-code')

    cy.get(selectors.button('Continue')).should('be.enabled').click().wait('@verify')

    cy.get(
      selectors.formError('Incorrect invite code. Please check with your organization.')
    ).should('be.visible')
  })

  it('Changing invite code after error should allow me to retry', () => {
    cy.get(selectors.signupView, { timeout: 5000 })
      .find(selectors.input('invite-code'))
      .clearAndType('another-wrong-invite-code')
    cy.get(selectors.button('Continue')).should('be.enabled')
  })
})
