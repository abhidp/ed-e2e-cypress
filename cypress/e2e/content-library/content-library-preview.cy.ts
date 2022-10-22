/* eslint-disable cypress/no-unnecessary-waiting */

describe('Feature: Content Library - Preview', () => {
  const course = {
    id: 'content-card-contents-5e8ed665597b48000ad3413f',
    title: 'How to be a Team Player',
    author: 'EdApp'
  }
  before(() => {
    cy.viewport('macbook-16')
    cy.logOutLMS()
    cy.createLmsAccount()
  })

  const waitForAnimation = () => cy.wait(1000)

  it('Navigate to preview courses library', () => {
    cy.navigateTo('LMS', '/courseware?show=content-library')
    cy.getByPlaceHolderText('Search by keyword').type(course.title)
    waitForAnimation()
    cy.getByTestId(course.id).contains('Preview').forceClick()
    waitForAnimation()
    cy.getByTestId('content-library-fullscreen-navbar').contains('Course library')
  })

  it('Should have the correct attributes', () => {
    cy.getByTestId('course-preview-title').contains(course.title)
    cy.getByTestId('course-preview-description').invoke('text').should('not.be.empty')
    cy.getByTestId('content-library-course-author').contains(course.author)
    cy.getByTestId('content-library-course-rating').should('exist')
  })

  it('Should be able have basic interaction with the slides', () => {
    cy.getByTestId('lesson-iframe').iframe().as('slide')
    waitForAnimation()
    cy.get('@slide').contains('Continue').forceClick()
    cy.get('@slide').findByTestId('lesson-header-page-num').contains('2').should('be.visible')
    cy.getByTestId('prev-slide-button').forceClick()
    cy.get('@slide').findByTestId('lesson-header-page-num').contains('1').should('be.visible')
    cy.getByTestId('next-slide-button').forceClick()
    cy.get('@slide').findByTestId('lesson-header-page-num').contains('2').should('be.visible')
  })

  it('Should be able to switch between lessons', () => {
    cy.getByTestIdLike('course-preview-lesson-item-').should('have.length.above', 1)
    cy.getByTestIdLike('course-preview-lesson-item-').eq(1).click()
    cy.getByTestId('lesson-iframe').iframe().as('slide')
    waitForAnimation()
    cy.getByTestId('next-slide-button').click()
    cy.get('@slide').findByTestId('lesson-header-page-num').contains('2').should('be.visible')
  })
})
