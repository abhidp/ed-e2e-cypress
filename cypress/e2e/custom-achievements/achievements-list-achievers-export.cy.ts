import { createEmail } from 'cypress/support/helper/common-util'
import defaultAchievements from 'cypress/fixtures/custom-achievements/default-achievements.json'
import { getNameFromEmail } from 'cypress/support/helper/utils'

let adminEmail: string
let learnerEmail: string

let firstName: string
let lastName: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const customAchievementTitle =
  'ED-16467: LMS - Ability for Admins to view achievers of a certain achievement and export the data'

const selectors = {
  searchInput: '[data-testid="search-input"]',
  achieversTab: '[data-testid="achievers"]',
  achievementListRow: "[data-testid*='selectable-table-row-']",
  achievementListItem: "[data-testid*='selectable-table-item-']"
}

describe('Feature: Custom Achievements', () => {
  beforeEach('Define network calls', () => {
    cy.intercept({ method: 'GET', url: '/api/custom-achievements' }).as('customAchievementsList')
    cy.intercept({ method: 'GET', url: '/api/custom-achievements/*/achievers/export-csv' }).as(
      'achieversListExported'
    )
  })

  describe('As LMS admin, on free plan', () => {
    xit('Can not access Achievers Tab when clicking into achievement', () => {
      adminEmail = createEmail()

      cy.task('setValue', { adminEmail })
      cy.createLmsAccount(adminEmail, password)
      cy.navigateTo('LMS', 'achievements')
      cy.url().should('include', 'achievements')

      cy.getByButtonText("Let's get started").click()
      cy.url().should('include', 'select-plan')
      cy.navigateTo('LMS', 'achievements')
      cy.get(selectors.searchInput).type(defaultAchievements.Beginner)
      cy.get(selectors.achievementListRow).click()
      cy.url().should('not.contain', '#recipe')
    })
    xit('Can not access Achievers Tab through url', () => {
      cy.navigateTo('LMS', '/achievements/new#achievers')
      cy.url().should('not.include', '#achievers')
    })
  })

  describe('As LMS admin, on Enterprise Plan', () => {
    beforeEach(() => {
      cy.task('getValue').then(value => {
        adminEmail = value.adminEmail
        learnerEmail = value.learnerEmail
        firstName = value.firstName
        lastName = value.lastName
      })
    })

    xit('Can view number of achievers in achievements list', () => {
      //Upgrade user to enterprise plan
      cy.upgradeToEnterprisePlan(adminEmail, password)

      // Create Learner
      learnerEmail = `edappt+learner+${adminEmail}`

      firstName = getNameFromEmail(learnerEmail).firstName
      lastName = getNameFromEmail(learnerEmail).lastName
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail, firstName, lastName })

      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.get(selectors.searchInput).type(defaultAchievements.Beginner)
      cy.get(selectors.achievementListRow).within(() => {
        cy.get(selectors.achievementListItem)
          .eq(5)
          .within(() => {
            cy.contains('0').should('be.visible')
          })
      })
    })

    xit('Displays empty state when there are no achievers', () => {
      cy.get(selectors.achievementListRow).click()
      cy.get(selectors.achieversTab).click()
      cy.url().should('include', '#achievers')
      cy.contains('There are currently no learners who have earned this achievement').should(
        'be.visible'
      )
    })

    xit('Displays number of achievers when achievements earned in achievements list', () => {
      cy.createCustomAchievement(adminEmail, password, customAchievementTitle, 'published', true)

      //Learner view
      cy.earnAchievementOnLearnersApp(learnerEmail, password, customAchievementTitle)
    })

    xit('Navigate back to check achievements list on LMS', () => {
      //Navigate back to check achievements list
      cy.navigateTo('LMS', 'achievements').wait('@customAchievementsList')
      cy.get(selectors.searchInput).type(customAchievementTitle)
      cy.get(selectors.achievementListRow).within(() => {
        cy.get(selectors.achievementListItem)
          .eq(5)
          .within(() => {
            cy.contains('1').should('be.visible')
          })
      })
    })

    xit('Displays achievers details in achievers tab and can export list', () => {
      cy.get(selectors.achievementListRow).first().click()
      cy.get(selectors.achieversTab).click()
      cy.url().should('include', '#achievers')
      cy.contains('There are currently no learners who have earned this achievement').should(
        'not.exist'
      )

      cy.contains(`${firstName} ${lastName}`).should('be.visible')

      cy.getByButtonText('Export Achievers').click().wait('@achieversListExported')
    })

    xit('Displays correct information in exported file', () => {
      let file = 'cypress/downloads/achievers.csv'

      cy.readFile(file).then(file => {
        cy.wrap(file).should('include', 'User')
        cy.wrap(file).should('include', 'User Group(s)')
        cy.wrap(file).should('include', 'Date Earned')
        cy.wrap(file).should('include', `${firstName} ${lastName}`)
      })
    })
  })
})
