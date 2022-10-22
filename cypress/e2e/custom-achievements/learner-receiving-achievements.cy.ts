import { createEmail } from 'cypress/support/helper/common-util'
import { defaultCustomAchievement } from 'cypress/support/helper/constants'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const customAchievementTitle1 =
  'One - ED-17268: App - Learner to receive Achievement on the spot - pops up on screen'
const customAchievementTitle2 =
  'Two - ED-17268: App - Learner to receive Achievement on the spot - pops up on screen'
const customAchievementTitle3 =
  'Three - ED-17268: App - Learner to receive Achievement on the spot - pops up on screen'
const customAchievementCompletionStatement = defaultCustomAchievement.completion
const customAchievementImageURL = defaultCustomAchievement.badgeMediaUrl

const selectors = {
  dialog: '[data-testid="dialog"]',
  profileButton: '[href="#profile"]',
  closeButton: '[data-testid="icon-button"]',
  customAchievementPreview: '[data-testid="custom-achievement-preview"]',
  customAchievementPreviewIcon: '[data-testid="custom-achievement-preview-icon"]',
  carouselNextButton: '[data-testid="carousel-arrow-next"]'
}

describe('Feature: Custom Achievements', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'POST', url: '/api/custom-achievements' }).as('customAchievementCreated')
    cy.intercept({ method: 'GET', url: 'api/custom-achievements/sync' }).as(
      'achievementsListFetched'
    )
  })

  describe('As Learner, on enterprise plan', () => {
    it('Can earn one achievment', () => {
      //Upgrade user to enterprise plan
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)

      // Create Learner
      learnerEmail = `edappt+learner+${adminEmail}`
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.upgradeToEnterprisePlan(adminEmail, password)

      //create live achievement
      cy.createCustomAchievement(adminEmail, password, customAchievementTitle1, 'published', true)

      //Learner view
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', '#home').wait('@achievementsListFetched')
      cy.get(selectors.dialog).should('be.visible')
      cy.get(selectors.dialog).within(() => {
        cy.contains(customAchievementTitle1.toUpperCase()).should('be.visible')
        cy.get(selectors.customAchievementPreview).should('be.visible')
        cy.contains(customAchievementCompletionStatement).should('be.visible')
        cy.get(selectors.customAchievementPreviewIcon).should('be.visible')
        cy.get(selectors.customAchievementPreviewIcon).should(
          'have.attr',
          'src',
          customAchievementImageURL
        )
        cy.get(selectors.closeButton).click()
      })
    })

    it('Should display multiple achievemnets if earned at the same time', () => {
      cy.createCustomAchievement(adminEmail, password, customAchievementTitle2, 'published', true)
      cy.createCustomAchievement(adminEmail, password, customAchievementTitle3, 'published', true)

      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', '#home').wait('@achievementsListFetched')
      cy.get(selectors.dialog).should('be.visible')
      cy.get(selectors.dialog).within(() => {
        cy.contains(customAchievementTitle3.toUpperCase()).should('be.visible')
        cy.get(selectors.carouselNextButton).click()
        cy.contains(customAchievementTitle2.toUpperCase()).should('be.visible')
        cy.get(selectors.closeButton).last().click()
      })
    })

    it('Should not display achievements dialog if already earned', () => {
      cy.get(selectors.profileButton).click().wait('@achievementsListFetched')
      cy.get(selectors.dialog).should('not.exist')
    })
  })
})
