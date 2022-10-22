import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseName = 'ED-14020 - Discussion Course Name'
const discussionTitle = 'ED-14020 - Discussion Title'
const postTextByLearner = 'This is a post for the ticket ED-14020'
const uploadImageByLearner = 'courses/courseThumbnail.jpg'
const postTextByAdmin = 'This is a post by admin for the ticket ED-14020'
const replyByLearner = 'This is a reply by learner for the ticket ED-14020'

const selectors = {
  publishButton: '[data-testid="PublishButton"]',
  button: (text: string) => `button:contains("${text}")`
}

// SKIP due to app flakiness: https://ed-app.atlassian.net/browse/ED-21547
// Uncaught Exception on LMS which loading Discussion page in E2E Test
xdescribe('Feature: Create Discussion in LMS and Comment as Learner', () => {
  beforeEach(() => {
    mockFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  describe('As an Admin - Create Discussion in LMS', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/course/*/lessons').as('discussionCreated')
      cy.intercept('PATCH', '**/api/discussions/*').as('discussionSaved')
      cy.intercept('GET', '/api/courses/**').as('courseFetched')
      cy.intercept('POST', '/api/courses/*/publish').as('coursePublished')
      cy.intercept('POST', '*/posts').as('postSent')
    })

    it('Setup', () => {
      adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
      cy.createCourse(adminEmail, password, courseName)
      cy.createLearnerAccount(adminEmail, password, `edappt+learner+${adminEmail}`, password, [
        'app-user'
      ])
      cy.setCookie('email', adminEmail)
    })

    it('Login to LMS and navigate to the API created Course', () => {
      cy.navigateTo('LMS', '/courseware')
      cy.url().should('include', 'courseware')
      cy.getByTestIdLike('content-card-contents')
        .first()
        .find(`[data-testid="edit-course-btn"]`)
        .should('exist')
        .forceClick()
      cy.url().should('include', '/v2/course').wait('@courseFetched')
      cy.get(selectors.publishButton).click().wait('@coursePublished')

      cy.navigateTo('LMS', '/courseware')
      cy.url().should('include', 'courseware')
    })

    it('Create a Discussion in the above Course and Publish it', () => {
      cy.getByTestIdLike('content-card-contents')
        .first()
        .find(`[data-testid="edit-course-btn"]`)
        .should('exist')
        .click()
      cy.url().should('include', '/v2/course')

      cy.get(selectors.button('Create lesson')).click()
      cy.getByTestId('create-discussion').click().wait('@discussionCreated')

      cy.getByValue('Untitled discussion').clearAndType(discussionTitle).wait('@discussionSaved')

      cy.getByTestId('discussionPromptTextInput')
        .type('ED-14020 - Discussion prompt')
        .blur()
        .wait('@discussionSaved')

      cy.getByTestId('postAndCommentRadio').should('be.checked')
      cy.getByTestId('allUsersRadio').should('be.checked')

      cy.getByTestId('PublishToggle-Checkbox')
        .click({ force: true })
        .wait('@discussionSaved')
        .then(discussion => {
          cy.addPostToDiscussionInLearnersApp(
            adminEmail,
            password,
            discussion.response.body.id,
            postTextByAdmin
          )
        })
    })
  })

  describe('As Learner, post comment on Discussion', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/discussions/**/posts').as('postSent')
      cy.intercept('POST', '**/edapp/upload').as('imageUploaded')
      cy.intercept('POST', '**/api/discussions/*/posts/*/comments').as('commentsReplied')
      cy.intercept('POST', '/api/Interactions/batch').as('batch')
    })

    it('As Learner, open the Discussion, upload Image and add Post', () => {
      cy.getCookie('email').then(adminEmail => {
        cy.loginToLearnersAppViaUI(`edappt+learner+${adminEmail.value}`, password)
      })

      cy.contains(courseName).click({ force: true })
      cy.url().should('include', '#course')

      cy.getByTestId('main course').getByTestId('progressPercentage').should('contain.text', '0%')
      cy.contains('Pass 100% of your lessons to complete this course').should('be.visible')

      cy.contains(discussionTitle).click({ force: true })
      cy.getByTestId('post-title').should('contain.text', discussionTitle)

      cy.getByTestId('Badge-Value').should('contain.text', '2')
      cy.contains('Incomplete').should('be.visible').click()

      cy.getByTestId('dialog').contains('Add a post').should('be.visible')
      cy.getByTestId('dialog').contains(`Reply to a peer's post`).should('be.visible')

      cy.getByButtonText('OK').click()

      cy.contains('Add Post').click()
      cy.getByPlaceHolderText('Have your say').type(postTextByLearner)
      cy.get('input[type=file]')
        .should('exist')
        .attachFile(uploadImageByLearner)
        .wait('@imageUploaded')
      cy.contains('Send').click().wait('@postSent')

      cy.contains(postTextByLearner).should('be.visible')
      cy.contains('Watching this Post').should('be.visible')

      cy.getByTestId('postImagePreview')
        .should('be.visible')
        .and('have.attr', 'src')
        .and('contain', 'https://media.edapp.com/image/upload')

      cy.getByTestId('Badge-Value').should('contain.text', '1')
      cy.contains('Incomplete').should('be.visible')
    })

    it(`As Learner, reply to other's post`, () => {
      cy.contains(postTextByAdmin).click()

      cy.wait(1000) // wait for transitions to finish
      cy.getByTestId('detail thread').getByPlaceHolderText('Add a reply').type(replyByLearner)
      cy.contains('Send').click().wait('@commentsReplied')

      cy.getByTestId('go-back-button').click()
      cy.wait(1000) // wait for transitions to finish
      cy.contains('Completed').should('be.visible').click()

      cy.getByTestId('dialog').contains('Add a post').should('be.visible')
      cy.getByTestId('dialog').contains(`Reply to a peer's post`).should('be.visible')
      cy.getByButtonText('OK').click()

      cy.getByTestId('progressPercentage').should('contain.text', '100%')
      cy.getByTestId('completed-icon').should('be.visible')
      cy.contains(`Well done! You’ve passed this course.`).should('be.visible')
    })
  })
})
