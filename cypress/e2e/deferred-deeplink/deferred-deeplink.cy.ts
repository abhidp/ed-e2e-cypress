/**
 * Note: Wherever you see "deeplink" - we're always referring to deferred deeplink.
 *
 * Deferred deeplinks are created from a third party called Branch.io
 *
 * This e2e-test doesn't work locally.
 */

import { createEmail } from 'cypress/support/helper/common-util'

const COURSE_TITLE = 'Deferred Deeplink Test Course'

describe('Feature: Deferred Deeplink', () => {
  it('Create a deeplink for a course', () => {
    const adminUser = createEmail()
    const password = 'Test123456'
    cy.task('setValue', { adminUser, password })

    cy.createLmsAccount(adminUser, password)
    cy.upgradeToEnterprisePlan(adminUser, password)
    cy.navigateTo('LMS', 'home')

    cy.intercept({ method: 'POST', url: 'v1/url' }).as('branchDeeplink')

    cy.createCourse(adminUser, password, COURSE_TITLE, true).then(courseId => {
      cy.navigateTo('LMS', 'v2/course/' + courseId)
      cy.getByTestId('course-three-dot-menu').click()
      cy.wait('@branchDeeplink')
      cy.getByTestId('share-deeplink-button').click()
      cy.getByTestId('copy-link-input')
        .invoke('val')
        .then(deeplinkUrl => {
          cy.task('setValue', { deeplinkUrl })
        })
    })
  })

  it('Open a deeplink for a course', () => {
    cy.task('getValue').then((value: any) => {
      cy.log(value.deeplinkUrl)

      cy.intercept('POST', 'https://api2.branch.io/v1/pageview').as('branchIoPageView')
      cy.visit(value.deeplinkUrl)
      cy.wait('@branchIoPageView')
      cy.url().should('include', '#login')

      cy.loginToLearnersAppViaUI(value.adminUser, value.password, {
        shouldWaitRapidRefresh: false,
        shouldNavigate: false,
        // !Note!
        // Looks like daily reward dialog is not showing up for deeplinks...
        // This could actually be a real bug!
        shouldCheckDailyReward: false
      })
      cy.getByTestId('courseTitle').should('contain.text', COURSE_TITLE)
    })
  })

  it('Deeplink should not show lock message', () => {
    // TODO @Julia
  })
})
