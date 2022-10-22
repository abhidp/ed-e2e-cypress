import { createEmail } from 'cypress/support/helper/common-util'
import defaultAchievements from 'cypress/fixtures/custom-achievements/default-achievements.json'
import { defaultCustomAchievement } from 'cypress/support/helper/constants'

let adminEmail: string
let learnerEmail: string
let liveAchievementId: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const achievementTitles = Object.values(defaultAchievements)
const liveCustomAchievementTitle =
  'LIVE - ED-17185: App - Ability for Learner to click into an Achievement to view details'
const draftCustomAchievementTitle =
  'DRAFT - ED-17185: App - Ability for Learner to click into an Achievement to view details'
const archivedCustomAchievementTitle =
  'ARCHIVED - ED-17185: App - Ability for Learner to click into an Achievement to view details'

const customAchievementCompletionStatement = defaultCustomAchievement.completion
const customAchievementImageURL = defaultCustomAchievement.badgeMediaUrl

const selectors = {
  achievementsButton: '[href="#achievements"]',
  dialog: '[data-testid="dialog"]',
  closeButton: '[data-testid="icon-button"]',
  achievementIcon: '[data-testid="custom-achievement-icon-wrapper"]',
  unearnedAchievementIcon: '[data-testid="unearned-achievement-icon"]',
  customAchievementPreview: '[data-testid="custom-achievement-preview"]',
  customAchievementPreviewIcon: '[data-testid="custom-achievement-preview-icon"]',
  customAchievementIcon: (imgURL: string) => `[src="${imgURL}"]`
}

describe('Feature: Custom Achievements', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: 'api/custom-achievements/sync' }).as(
      'achievementsListFetched'
    )
  })
  describe('As Learner, on a Free Plan', () => {
    it('Can preview achievements in my profile and navigate to achievements page', () => {
      //Create admin
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)

      // Create Learner
      learnerEmail = `edappt+learner+${adminEmail}`
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', '#profile')
      cy.get(selectors.achievementsButton).should('be.visible')
      cy.get(selectors.unearnedAchievementIcon).should('have.length.at.least', 4)
      cy.get(selectors.achievementsButton).click()
      cy.url().should('include', 'achievements')
    })

    it('Can view all default achievements and click to see more achievement details', () => {
      cy.get(selectors.achievementIcon).should('have.length', achievementTitles.length)
      achievementTitles.forEach(achievement => {
        cy.contains(achievement).should('be.visible')
        cy.contains(achievement).click()
        cy.get(selectors.dialog).should('be.visible')
        cy.get(selectors.dialog).within(() => {
          cy.contains(achievement.toUpperCase()).should('be.visible')
          cy.contains('?').should('be.visible')
          cy.get(selectors.closeButton).click()
        })
        cy.get(selectors.dialog).should('not.exist')
      })
    })
  })
  describe('As Learner, on Enterprise Plan', () => {
    it('Can preview default and live custom achievements in achievements page', () => {
      //Upgrade user to enterprise plan
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.createCustomAchievement(
        adminEmail,
        password,
        liveCustomAchievementTitle,
        'published',
        true
      ).then(id => {
        liveAchievementId = id
      })
      cy.createCustomAchievement(
        adminEmail,
        password,
        draftCustomAchievementTitle,
        'drafted',
        false
      )

      cy.earnAchievementOnLearnersApp(learnerEmail, password, liveCustomAchievementTitle)
      cy.navigateTo('LEARNERS_APP', '#profile').wait('@achievementsListFetched')
      cy.get(selectors.achievementsButton).should('be.visible')
      cy.get(selectors.achievementsButton).click()
      cy.url().should('include', 'achievements')
    })

    it('Can click an earned achievement and see details', () => {
      //click on one of the live achievements and check details visible
      cy.contains(liveCustomAchievementTitle.substring(0, 6)).should('be.visible').click()
      cy.get(selectors.dialog).should('be.visible')

      cy.get(selectors.dialog).within(() => {
        cy.get(selectors.customAchievementPreview).should('be.visible')
        cy.get(selectors.customAchievementPreview).within(() => {
          cy.contains(liveCustomAchievementTitle.toUpperCase()).should('be.visible')
          cy.contains(customAchievementCompletionStatement).should('be.visible')

          cy.get(selectors.customAchievementPreviewIcon).should('be.visible')
          cy.get(selectors.customAchievementPreviewIcon).should(
            'have.attr',
            'src',
            customAchievementImageURL
          )
        })
        cy.get(selectors.closeButton).click()
      })
    })

    it('Can view all default and live custom achievements, and no draft achievements', () => {
      // new live custom achievement should be visible
      cy.get(selectors.customAchievementIcon(customAchievementImageURL)).should('be.visible')
      cy.contains(liveCustomAchievementTitle.substring(0, 6)).should('be.visible')
      cy.contains(draftCustomAchievementTitle.substring(0, 6)).should('not.exist')
      cy.get(selectors.achievementIcon).should('have.length.at.least', achievementTitles.length)

      //check all default achievements exist
      achievementTitles.forEach(achievement => {
        cy.contains(achievement).should('be.visible')
        cy.contains(achievement).click()
        cy.get(selectors.dialog).should('be.visible')
        cy.get(selectors.dialog).within(() => {
          cy.contains(achievement.toUpperCase()).should('be.visible')
          cy.contains('?').should('be.visible')
          cy.get(selectors.closeButton).click()
        })
        cy.get(selectors.dialog).should('not.exist')
      })
    })

    it('Can not view archived achievements', () => {
      cy.updateCustomAchievement(adminEmail, password, liveAchievementId, 'archived', false)

      cy.createCustomAchievement(
        adminEmail,
        password,
        archivedCustomAchievementTitle,
        'archived',
        false
      )

      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', '#achievements').wait('@achievementsListFetched')

      //earned and archived achievements are still visible
      cy.contains(liveCustomAchievementTitle.substring(0, 6)).should('be.visible')
      cy.get(selectors.customAchievementIcon(customAchievementImageURL)).should('be.visible')

      //unearned and archived achievements are hidden
      cy.contains(archivedCustomAchievementTitle).should('not.exist')
    })
  })
})
