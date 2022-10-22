import { loginToLearnersApp } from '../helper/api-helper'

type LoginOptions = {
  /**
   * Option to make the function not navigate to learners app
   *
   * @default true
   */
  shouldNavigate: boolean
  /**
   * Option to make the function not await for rapid refresh api call.
   *
   * @default true
   */
  shouldWaitRapidRefresh: boolean
  /**
   * Option to not check for stars daily reward
   *
   * @default true
   */
  shouldCheckDailyReward: boolean
  /**
   * Option to check for interaction visit
   *
   * @default true
   */
  shouldCheckVisitInteraction: boolean
}

const defaultOptions: LoginOptions = {
  shouldCheckDailyReward: true,
  shouldNavigate: true,
  shouldWaitRapidRefresh: true,
  shouldCheckVisitInteraction: false
}

export const loginToLearnersAppViaUI = (
  learnerEmail,
  learnerPassword,
  options: LoginOptions = defaultOptions
) => {
  if (options.shouldNavigate) {
    cy.navigateTo('LEARNERS_APP', '#login', true)
    cy.reload()
  }

  cy.url().should('include', '#login')

  cy.intercept('POST', '/api/users/verify').as('verify')
  cy.intercept('POST', '/api/invite/register').as('userRegistered')
  cy.intercept('POST', '/api/login/learner').as('userLoggedIn')
  cy.intercept('GET', '/api/rapid-refresh/sessions').as('rapidRefresh')
  cy.intercept('GET', 'api/users/sync').as('sync')
  cy.intercept('POST', '/api/stars/check-daily-reward').as('checkDailyReward')

  let hasVisited = false
  if (options.shouldCheckVisitInteraction) {
    cy.intercept('POST', '/api/Interactions/batch', req => {
      if (hasVisited) {
        // interactions can happen multiple times when running other tests
        // once we ensured it happened, we can let it go
        return
      }

      const visitInteraction = req.body.find((item: any) => item.type === 'visit')
      expect(visitInteraction).to.exist
      hasVisited = true
    }).as('interaction')
  }

  cy.getByName('username').type(learnerEmail, { delay: 10 })
  cy.get('form').submit().wait('@verify')

  cy.getByName('password').type(learnerPassword, { delay: 100 })

  cy.get('form').submit()

  cy.wait('@userLoggedIn').then(login => {
    if (login.response.body.invitationStatus == 'invited') {
      cy.contains('Create Your New Password')
        .parent()
        .find('input')
        .forceClick()
        .type(learnerPassword, { delay: 100 })

      cy.getByTestId('registerButton').should('be.enabled').click().wait('@userRegistered')
    }
  })

  if (options.shouldCheckVisitInteraction) {
    cy.wait('@interaction')
  }

  if (options.shouldWaitRapidRefresh) {
    cy.wait('@rapidRefresh')
  }

  if (options.shouldCheckDailyReward) {
    cy.wait('@sync').then(sync => {
      if (sync.response.body['ed'].enableStars) {
        cy.wait('@checkDailyReward').then(reward => {
          if (reward.response.body.awardedStars > 0) {
            closeDailyRewardDialog()
          }
        })
      }
    })
  }
}

export const loginToLearnersAppViaAPI = (learnerEmail: string, learnerPassword: string) => {
  return loginToLearnersApp(learnerEmail, learnerPassword).then(loginResponseBody => {
    cy.intercept('GET', '/api/rapid-refresh/sessions').as('rapidRefresh')
    cy.intercept('GET', 'api/users/sync').as('sync')
    cy.intercept('POST', '/api/stars/check-daily-reward').as('checkDailyReward')

    cy.visit(`${Cypress.env('LEARNERS_APP')}/sso-login?token=${loginResponseBody.sso_token}`)
    cy.wait('@sync').then(sync => {
      if (sync.response.body['ed'].enableStars) {
        cy.wait('@checkDailyReward').then(reward => {
          if (reward.response.body.awardedStars > 0) {
            closeDailyRewardDialog()
          }
        })
      }
    })
  })
}

const closeDailyRewardDialog = () => {
  cy.get('#app-open-reward').then($dailyReward => {
    if ($dailyReward[0][0].innerText.includes('OK, thanks')) {
      cy.getByButtonText('OK, thanks!').forceClick()
      cy.getByTestId('star-balance-view-token-count').should('exist').and('be.visible')
      cy.getByTestId('star-balance-view-token-star').should('exist').and('be.visible')
    }
  })
  cy.url().should('include', '#home')
  cy.wait('@sync')
}
