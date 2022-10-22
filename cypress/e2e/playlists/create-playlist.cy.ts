/* eslint-disable cypress/no-unnecessary-waiting */
/* 
  - Create Courses via API
  - Add courses to Playlists in UI
*/

import { createEmail } from 'cypress/support/helper/common-util'
import {
  deleteCourseByIdFromHippo,
  addCoursesToPlaylistFromHippo
} from 'cypress/support/helper/api-helper'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-15102-Course-'
const playlistTitle = 'ED-15102: New Playlist'
const playlistDescription = 'ED-15102: This is a description'
const noOfCourses = 3
const courseIdList: string[] = []
const courseTitleList: string[] = []
const brandingCoverImage = 'courses/courseCover.jpg'

let playlistId: string

const saveAllChanges = () => {
  cy.getByButtonText('Save Changes').should('be.enabled').forceClick().wait('@playlistUpdated')
}

describe('Feature: Create Playlists', () => {
  beforeEach('Define Network Calls', () => {
    cy.intercept('POST', '/api/playlists').as('playlistCreated')
    cy.intercept('PUT', `/api/playlists/${playlistId}`).as('playlistUpdated')
    cy.intercept('POST', 'https://api.cloudinary.com/v1_1/edapp/upload').as('imageUploaded')
  })

  after('Delete Courses', () => {
    courseIdList.forEach(courseId => {
      deleteCourseByIdFromHippo(email, password, courseId)
    })
  })

  it('Setup Accounts and create Courses via API', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)
    cy.upgradeToEnterprisePlan(email, password)

    for (let i = 0; i < noOfCourses; i++) {
      cy.createCourse(email, password, `${courseTitle}${i}`, true).then(courseId => {
        courseIdList.push(courseId)
        courseTitleList.push(`${courseTitle}${i}`)
      })
    }
  })

  const createPlaylistWithoutSaving = () => {
    cy.navigateTo('LMS')

    cy.contains('Courseware').forceClick()
    cy.contains('Playlists').forceClick()

    cy.url().should('include', '/playlists')
    cy.contains('Use playlists to guide your users through a sequence of courses')
    cy.contains('Create a playlist to get started')

    cy.contains('Create a playlist').click()
    cy.url().should('include', '/playlists/new')
    cy.title().should('include', 'Ed LMS · Playlists')

    cy.contains('There are currently no courses in this playlist').should('be.visible')
    cy.contains('Add a course to get started').should('be.visible')

    cy.getByPlaceHolderText('New Playlist').type(playlistTitle)
    cy.getByButtonText('Save Changes').should('be.enabled')
    cy.getByPlaceHolderText('Playlist Description').type(playlistDescription)
    cy.wait(500) //wait for debounce to take effect
  }

  it('Leave page without Saving should not create Playlist', () => {
    createPlaylistWithoutSaving()
    //Leave without Saving: click Cancel button
    cy.getByClassNameLike('StyledCrumbLinkText').contains('Playlists').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Leave page without saving?')
      .and('contain.text', 'Changes you have made will be discarded')

    cy.getByButtonText('Cancel').forceClick()
    cy.getByTestId('dialog').should('not.be.visible')

    //Leave without Saving: click Leave button
    cy.getByClassNameLike('StyledCrumbLinkText').contains('Playlists').click()

    cy.getByButtonText('Leave').forceClick()
    cy.url().should('include', '/playlists')
  })

  it('Create New Playlist and publish it', () => {
    createPlaylistWithoutSaving()

    cy.getByTestId('playlist-status').contains('Draft', { matchCase: false }).should('be.visible')
    cy.getByTestId('PublishToggle-Checkbox').forceClick()
    cy.getByTestId('playlist-status')
      .contains('Published', { matchCase: false })
      .should('be.visible')

    cy.getByButtonText('Save Changes')
      .should('be.enabled')
      .forceClick()
      .wait('@playlistCreated')
      .then(playlist => {
        console.log(playlist)
        playlistId = `${playlist.response.body}`
      })
  })

  it('Add existing courses to Playlist', () => {
    cy.navigateTo('LMS', `/playlists/${playlistId}`)

    cy.contains('Add courses to this playlist').click()
    cy.getByTestId('dialog').should('be.visible')
    cy.contains('Select courses to add to this playlist').should('be.visible')
    cy.contains('0 courses selected').should('be.visible')
    cy.contains('Add Courses to Playlist').should('be.disabled')

    cy.contains(courseTitleList[0]).forceClick()
    cy.contains('1 course selected').should('be.visible')
    cy.contains('Add Courses to Playlist').should('be.enabled')

    cy.contains(courseTitleList[1]).forceClick()
    cy.contains('2 courses selected').should('be.visible')
    cy.contains('Add Courses to Playlist').should('be.enabled').click()

    cy.getByTestId('dialog').should('not.exist')

    cy.contains(courseTitleList[0]).should('be.visible')
    cy.contains(courseTitleList[1]).should('be.visible')

    saveAllChanges()
  })

  it('Remove course from Playlist', () => {
    addCoursesToPlaylistFromHippo(email, password, playlistId, playlistTitle, [
      `${courseIdList[2]}`
    ])

    cy.navigateTo('LMS', `/playlists/${playlistId}`)

    cy.wait(1000)
    cy.getByTestId(`playlistCourseCard-${courseIdList[2]}`)
      .find('[data-testid=deleteButton]')
      .find('[data-testid=icon]')
      .forceClick()

    cy.contains(courseTitleList[2]).should('not.exist')
    saveAllChanges()
  })

  it('Enrolment - Add existing courses to Playlist', () => {
    cy.navigateTo('LMS', `/playlists/${playlistId}`)
    cy.getByTestId('playlist-settings-link').click({ force: true })
    cy.getByTestId('enrolment').click()

    cy.contains('User Enrolment').should('be.visible')
    cy.contains('Enrolment Date').should('be.visible')
    cy.contains(
      'Users are enrolled into this playlist automatically when they are added to a selected user group.'
    ).should('be.visible')

    cy.contains('User Group Enrolment').should('be.visible')
    cy.contains('Select the user groups to be enrolled in this playlist').should('be.visible')

    cy.getByTestId('checkbox-label')
      .should('contain.text', 'Universal Access')
      .and('contain.text', 'Allow this playlist to be visible to all users')

    cy.getByTestId('selectable-list').should('be.visible')
    cy.getByTestId('search-input').should('be.visible')
    cy.getByPlaceHolderText('Search for a user group').should('be.visible')
    cy.getByTestId('selectable-list-box-unselected').should('be.visible')
    cy.getByTestId('selectable-list-box-selected').should('be.visible')

    cy.getByTestId('checkbox').forceClick()
    saveAllChanges()
  })

  it('Branding - Add Cover and Completion Slide images', () => {
    cy.navigateTo('LMS', `/playlists/${playlistId}`)
    cy.getByTestId('playlist-settings-link').click({ force: true })
    cy.getByTestId('branding').click()

    cy.contains('Cover Image')
      .parent()
      .find('[data-testid="uploadImageButton"]')
      .attachFile(brandingCoverImage)
      .wait('@imageUploaded')

    cy.contains('Completion Slide')
      .parent()
      .find('[data-testid="uploadImageButton"]')
      .attachFile(brandingCoverImage)
      .wait('@imageUploaded')

    cy.contains('Completion Slide')
      .parent()
      .find('textarea')
      .should('have.attr', 'placeholder', 'Congratulations! You have completed this playlist.')

    cy.contains('Completion Slide').parent().find('textarea').clear().type('Well Done!!')

    saveAllChanges()
  })

  it('Translation - Add Translation', () => {
    cy.navigateTo('LMS', `/playlists/${playlistId}`)
    cy.getByTestId('playlist-settings-link').click({ force: true })
    cy.getByTestId('translations').click()

    cy.contains('There are no translations for this playlist').should('be.visible')
    cy.contains('Add a translation to get started').should('be.visible')

    cy.contains('Add a translation').click().waitForDialogWindow()

    cy.getByTestId('dialog')
      .should('contain.text', 'Add a translation')
      .and('contain.text', 'Select the original playlist language and the desired translation.')

    cy.contains('Translate from').parent().contains('Search for a language').first().forceClick()
    cy.contains('Arabic').forceClick()

    cy.contains('To').parent().contains('Search for a language').first().forceClick()
    cy.contains('Afrikaans').forceClick()

    cy.getByButtonText('Add translation').forceClick()
  })
})
