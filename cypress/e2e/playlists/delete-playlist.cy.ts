/* 
  - Create playlist from API
  - Delete from FrontEnd
*/

import { createEmail } from 'cypress/support/helper/common-util'

let email: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const playlistTitle = 'ED-15101: Delete Playlist'
let playlistId: string

describe('Feature: Delete playlist', () => {
  it('Setup Account and create Playlist via API', () => {
    email = createEmail()
    cy.createLmsAccount(email, password)
    cy.upgradeToEnterprisePlan(email, password)
    cy.createPlaylist(email, password, playlistTitle).then(response => {
      playlistId = `${response}`
    })
  })

  it('Navigate to Playlist page and delete the playlist', () => {
    cy.navigateTo('LMS', '/playlists')
    cy.getByTestId(`content-card-contents-${playlistId}`)
      .should('be.visible')
      .and('contain.text', playlistTitle)

    cy.getByTestId('cardDeleteButton').click()
    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Are you sure you want to delete this playlist?')

    cy.getByButtonText('Cancel').click()
    cy.getByTestId('dialog').should('not.exist')

    cy.getByTestId('cardDeleteButton').click()

    cy.intercept({ method: 'DELETE', url: `/api/playlists/${playlistId}` }).as('playlistDeleted')
    cy.getByButtonText('Delete').click().wait('@playlistDeleted')
    cy.getByTestId(`content-card-contents-${playlistId}`).should('not.exist')

    cy.contains('Use playlists to guide your users through a sequence of courses').should(
      'be.visible'
    )
    cy.contains('Create a playlist to get started').should('be.visible')
  })
})
