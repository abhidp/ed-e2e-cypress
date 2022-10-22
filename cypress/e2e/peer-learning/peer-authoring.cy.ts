import { SlideSubstitutionMap } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { deleteCourseByIdFromHippo } from 'cypress/support/helper/api-helper'

const adminUser = createEmail()
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-19445-Course'
const lessonTitle = 'ED-19445-lesson'
const lessonTitleUpdated = 'ED-19445-lesson-updated'
const slideTitleUpdated = 'ED-19445-slide-updated'
const commentText = 'ED-19445-comment'
const videoURL =
  'https://res.cloudinary.com/edapp/video/upload/v1644284722/testing/videos/IMG_8233.mov'
const videoTitle = 'ED-19445-video-title'
const videoDescription = 'ED-19445-video-description'
let courseId: string
let lessonId: string
let slideId: string
let mediaId: string
let commentId: string
const slideSubstitutionMap: SlideSubstitutionMap = {
  type: 'peer-authoring',
  subtype: 'peer-authoring',
  templateName: 'Peer Authoring',
  questions: '[]',
  title: 'Slide Title',
  buttonText: 'Upload now',
  noMediaUploaded: 'No videos have been uploaded yet.',
  prompt: 'Scroll to see more',
  doneText: 'Continue'
}

describe('Feature: Peer Authoring 👑 ', () => {
  it('Create an account, course, lesson, peer slide, upload video and add a comment to the peer slide', () => {
    //Create admin
    cy.createLmsAccount(adminUser, password)

    //Create course, lesson, peer slide
    cy.createCourseLessonAndSlide(
      adminUser,
      password,
      courseTitle,
      lessonTitle,
      true,
      true,
      slideSubstitutionMap
    )
      .then(response => {
        courseId = response.courseId
        lessonId = response.lessonId
        slideId = response.slideId
      })
      .then(() => {
        // upload video via POST api/peerAuthoring/.../media
        cy.addDefaultVideo(
          adminUser,
          password,
          lessonId,
          slideId,
          videoURL,
          videoTitle,
          videoDescription
        )
          .then(response => {
            mediaId = response.body.id
          })
          .then(() => {
            // add a comment to a video via POST api/peerAuthoring/.../comment
            cy.addCommentToVideo(adminUser, password, lessonId, slideId, mediaId, commentText).then(
              response => {
                commentId = response.body.id
              }
            )
          })
      })
  })

  describe('As LMS admin check Peer Summary and Submission pages', () => {
    it('Should go to Peer Summary Page and check Course and Lesson titles, number of slides, video and comments', () => {
      cy.navigateTo('LMS', 'peer-authoring')
      cy.getByTestId('pa-table').contains('td', courseTitle).should('be.visible')
      cy.getByTestId('pa-table').contains('td', lessonTitle).should('be.visible')
      cy.getByTestId('pa-table')
        .contains('td', lessonTitle)
        .next()
        .should('have.text', '1') // check number of slides
        .next()
        .should('have.text', '1') // check number of video
        .next()
        .should('have.text', '1') // check number of comments
    })

    it('Should go to Peer Authoring Submission Page and check slide and video titles, video URL, comment', () => {
      cy.navigateTo('LMS', 'peer-authoring')

      cy.intercept('GET', `api/peerAuthoring/${lessonId}/${slideId}/mediaWithComments`).as(
        'readPeerAuthoring'
      )
      cy.contains('View submissions').click().wait('@readPeerAuthoring')

      cy.getByTestId('pa-lesson-slide-title').should('contain.text', slideSubstitutionMap.title)

      cy.getByTestId('pa-lesson-video-title').should('contain.text', videoTitle)
      cy.getByTestId('pa-lesson-video-container')
        .should('be.visible')
        .find('source')
        .and('have.attr', 'src')
        .and('include', `${videoURL}`)

      cy.getByTestId('pa-lesson-video-author').should('contain.text', `Uploaded by ${adminUser}`)

      cy.getByTestId('comment-message').should('contain.text', commentText)
      cy.getByTestId('comment-message-author').should('contain.text', adminUser)
    })

    it('Should go to Peer Summary Page and check that lesson and slide titles are updated', () => {
      cy.intercept({ method: 'GET', url: '**/build/index.html' }).as('thomasUpdated')

      // update lesson
      cy.updateLesson(adminUser, password, courseId, lessonId, lessonTitleUpdated).then(() => {
        cy.navigateTo('LMS', 'peer-authoring')
        cy.getByTestId('pa-table').contains('td', lessonTitleUpdated).should('be.visible')
      })
      // update slide: CI issue: https://ed-app.atlassian.net/browse/ED-19984
      // cy.intercept('GET', `lesson/${lessonId}/get-config`).as('readLesson')
      // cy.navigateTo('LMS', `lesson/${lessonId}/edit`).wait('@readLesson')

      // cy.intercept({ method: 'POST', url: '/lesson/save' }).as('lessonSaved')
      // cy.get('[data-rbd-draggable-id="slide-1"]').forceClick() // click on second slide

      // cy.getByClassNameLike('form-control')
      //   .contains(slideSubstitutionMap.title)
      //   .click()
      //   .clearAndType(slideTitleUpdated)
      // cy.getByClassNameLike('form-control')
      //   .contains(slideSubstitutionMap.buttonText)
      //   .click()
      //   .clearAndType('Button text') // it's a workaround to not put an extra wait after @thomasUpdated; it's needed because frontend cannot handle value selection since this done very quickly
      //   .wait('@thomasUpdated')
      // cy.getByTestId('SaveButton')
      //   .click()
      //   .wait('@lessonSaved')
      //   .then(() => {
      //     cy.intercept('GET', `api/peerAuthoring/${lessonId}/${slideId}/mediaWithComments`).as(
      //       'readPeerAuthoring'
      //     )
      //     cy.navigateTo('LMS', `peer-authoring/${lessonId}/${slideId}#`).wait('@readPeerAuthoring')
      //     cy.getByClassNameLike('slide-title').should('contain.text', slideTitleUpdated)
      //   })
    })

    it('Should go to Peer Summary Page and verify absence of comment and video in the table', () => {
      cy.intercept('GET', `api/peerAuthoring/${lessonId}/${slideId}/mediaWithComments`).as(
        'readPeerAuthoring'
      )

      // delete video comment via DELETE api/peerAuthoring/.../comment/...
      cy.deleteCommentFromVideo(adminUser, password, lessonId, slideId, mediaId, commentId).then(
        () => {
          cy.navigateTo('LMS', `peer-authoring/${lessonId}/${slideId}#`).wait('@readPeerAuthoring')
          cy.getByTestId('comment-message').should('not.exist')
          cy.contains(`No comments yet.`).should('exist').and('be.visible')

          // delete a video via POST api/peerAuthoring/.../media/...
          cy.deleteDefaultVideo(adminUser, password, lessonId, slideId, mediaId).then(() => {
            cy.reload()
            cy.navigateTo('LMS', `peer-authoring/${lessonId}/${slideId}#`).wait(
              '@readPeerAuthoring'
            )
            cy.getByTestId('pa-lesson-video-container').should('not.exist')
            cy.contains(`Your learners haven't made any contributions on this slide yet.`)
              .should('exist')
              .and('be.visible')

            // verify number of video and comments in Summary table
            cy.getByClassNameLike('StyledCrumbLink').first().click()
            cy.get('td:nth-child(4)').should('have.text', '0') // check number of videos
            cy.get('td:nth-child(5)').should('have.text', '0') // check number of comments
          })
        }
      )
    })

    it.skip('Should go to Peer Summary Page and verify absence of a course in the table', () => {
      // skip due to code issue https://ed-app.atlassian.net/browse/ED-19881

      deleteCourseByIdFromHippo(adminUser, password, courseId).then(() => {
        cy.navigateTo('LMS', 'peer-authoring')
        cy.contains(`This account doesn't have any contributions from the learners yet.`)
          .should('exist')
          .and('be.visible')
      })
    })
  })
})
