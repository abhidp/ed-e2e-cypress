import { createEmail } from 'cypress/support/helper/common-util'

const password = Cypress.env('COMMON_TEST_PASSWORD')
const playlistTitle = 'Rock and Roll'
const course1 = 'Rolling Stones'
const course2 = 'ACDC'
const course3 = 'Black Sabbath'

describe('Feature: Learner Playlist', () => {
  it('Setup Accounts and create Courses/Playlist via API', () => {
    const email = createEmail()
    cy.task('setValue', { email })

    cy.createLmsAccount(email, password)
    cy.upgradeToEnterprisePlan(email, password)

    // create courses
    const courseIds: string[] = []
    cy.createCourse(email, password, course1, true).then(courseId => courseIds.push(courseId))
    cy.createCourse(email, password, course2, true).then(courseId => courseIds.push(courseId))
    cy.createCourse(email, password, course3, true).then(courseId => courseIds.push(courseId))

    // create playlist and assign courses
    cy.createPlaylist(email, password, playlistTitle).then(response => {
      cy.task('setValue', { playlistId: response })
      cy.addCoursesToPlaylist(email, password, response, playlistTitle, courseIds)
    })
  })

  it('Navigate to Learners App Playlist', () => {
    cy.task('getValue').then(({ email, playlistId }: any) => {
      cy.loginToLearnersAppViaUI(email, password)
      cy.navigateTo('LEARNERS_APP', `#playlist/${playlistId}`)

      cy.contains(course1).click({ force: true })
      cy.getByTestId('detail course').getByTestId('courseTitle').should('contain.text', course1)

      cy.contains(course2).click({ force: true })
      cy.getByTestId('detail course').getByTestId('courseTitle').should('contain.text', course2)

      cy.contains(course3).click({ force: true })
      cy.getByTestId('detail course').getByTestId('courseTitle').should('contain.text', course3)

      cy.getByButtonText('Start Playlist').should('exist')
    })
  })
})
