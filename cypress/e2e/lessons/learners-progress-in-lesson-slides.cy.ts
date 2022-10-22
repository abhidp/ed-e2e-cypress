import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { getThomasIframe } from 'cypress/support/helper/utils'

const adminUser = createEmail()
const learnerEmail = `edappt+learner+${adminUser}`
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-19033-Course'
const lessonTitle = 'ED-19033-Lesson'
let courseId: string
let lessonId: string

const firstSlideTitle = 'A title slide'
const secondSlideTitle = 'Can I do a simple true or false question?'

function navigateToLesson() {
  cy.task('getValue').then(value => {
    cy.loginToLearnersAppViaUI(value.learnerEmail, password)
    cy.getByTestId('tab-content-for-you').findByTestId(`CourseCard-${value.courseId}`).forceClick()
  })
}

function getSlide(slideIndex: number) {
  return cy.getByTestId(`slide-list-item-${slideIndex}`).as('slide')
}

describe('Feature: Learner progression through slides', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  describe('As LMS admin', () => {
    it('Create an account, learner, course and lesson', () => {
      //Create LMS account and upgarde to Enterprise plan
      cy.createLmsAccount(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)

      //Create course and lesson
      cy.createCourseLessonAndSlide(adminUser, password, courseTitle, lessonTitle, true, true).then(
        response => {
          courseId = response.courseId
          lessonId = response.lessonId
          cy.task('setValue', { courseId })
        }
      )

      //Create learner
      cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])
      cy.task('setValue', { learnerEmail })
    })
  })

  describe('As a learner', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/Interactions/batch').as('batchInteraction')
      cy.intercept('GET', `/api/slide-progress?lessonIds[0]=${lessonId}`).as('lessonProgress')
      cy.intercept('GET', `/api/courses/${courseId}/*`).as('getCourse')
      cy.intercept('GET', '/api/users/sync').as('sync')
    })

    it('Should navigate to the lesson and interact with slides', () => {
      navigateToLesson()

      cy.get('#start-lesson').click()

      // go to the first slide
      getSlide(0).should('not.have.css', 'cursor', 'not-allowed').contains(firstSlideTitle)
      getSlide(0).click()
      getThomasIframe().contains(firstSlideTitle).should('be.visible')

      // Should not be able to click and navigate to next slides when learner has not finished the first slide
      cy.get('ul>li')
        .should('have.length', 3)
        .each((li, index) => {
          // Skip first slide
          if (index !== 0) {
            cy.wrap(li).should('have.css', 'cursor', 'not-allowed')
            cy.wrap(li).click({ force: true })
            // Still on first slide in Details
            getThomasIframe().contains(firstSlideTitle).should('be.visible')
          }
        })

      // Should be able to click and navigate to any slide once lesson is completed

      // Interact with first slide
      getThomasIframe().contains('Ok, let’s go!').should('be.visible').click()

      // Interact with the second slide
      getThomasIframe().find('.correct').should('be.visible').trigger('mouseenter').click()

      getThomasIframe()
        .find('.slide-multiple-choice-game')
        .contains('Continue')
        .should('be.visible')
        .click({ force: true })

      getThomasIframe()
        .find('#slide-answer')
        .contains('Continue')
        .should('be.visible')
        .click()
        .wait('@batchInteraction')

      // Interact with list items in Main
      cy.get('ul>li')
        .should('have.length', 3)
        .each(li => {
          cy.wrap(li).should('not.have.css', 'cursor', 'not-allowed')
        })

      // Exit lesson
      getThomasIframe()
        .contains('Exit Lesson', { matchCase: true })
        .should('be.visible')
        .click({ force: true })
        .wait(['@batchInteraction', '@lessonProgress'])
    })

    it('Should not be able to jump slides when learner restarts lesson', () => {
      // navigate to the course to check progress
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', `#course/${courseId}`).wait([
        '@getCourse',
        '@batchInteraction',
        '@sync'
      ])

      cy.get('#start-lesson').click()

      cy.get('ul>li')
        .should('have.length', 3)
        .each((li, index) => {
          // Skip first slide
          if (index !== 0) {
            cy.wrap(li).should('have.css', 'cursor', 'not-allowed')
            cy.wrap(li).click({ force: true })
            // Still on first slide in Details
            getThomasIframe().contains(firstSlideTitle).should('be.visible')
          }
        })

      //Should not be able to jump to next slides when learner reattempts lesson from a previous slide

      // Interact with first slide
      getThomasIframe().contains('Ok, let’s go!').should('be.visible').click()

      // Interact with the second slide
      getThomasIframe().find('.correct').should('be.visible').trigger('mouseenter').click()

      getThomasIframe()
        .find('.slide-multiple-choice-game')
        .contains('Continue')
        .should('be.visible')
        .click({ force: true })

      getThomasIframe()
        .find('#slide-answer')
        .contains('Continue')
        .should('be.visible')
        .click()
        .wait('@batchInteraction')

      // Go back to the first slide and reattemps lesson
      getSlide(0).click()

      // Continue to second slide
      getThomasIframe().contains('Ok, let’s go!').should('be.visible').click()

      // Attempt to jump to third slide
      getSlide(2).should('have.css', 'cursor', 'not-allowed')
      getSlide(2).click()
      // Still on second slide in Details
      getThomasIframe().contains(secondSlideTitle).should('be.visible')
    })

    it('Should have completed the lesson and earned all stars', () => {
      cy.loginToLearnersAppViaUI(learnerEmail, password)
      cy.navigateTo('LEARNERS_APP', `#course/${courseId}`).wait([
        '@getCourse',
        '@batchInteraction',
        '@sync'
      ])

      // Confirm lesson has been completed and stars earned
      cy.contains('Restart Lesson')
      cy.contains('Earned all stars')
    })
  })
})
