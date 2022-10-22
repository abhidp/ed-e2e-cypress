import data from '../../fixtures/logins/logins.json'
import {
  deleteUserGroupsIdsFromEmily,
  getBanner,
  getUserGroupsIdsFromEmily
} from 'cypress/support/helper/api-helper'
import { timeDiffInHours } from 'cypress/support/helper/common-util'

const adminEmail = data.banners.adminEmail
const learnerEmail = data.banners.learnerEmail
let bannerId: string
let bannerImageId: string
let userGroupName: string
let bannerImageUpdatedId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const bannerTitle = `Banner ${Date.now()}`
const bannerImage = 'prizing/prize-background.jpg'
const bannerHyperlink = 'https://support.edapp.com/'
const bannerImageUpdated = 'courses/certificateLogo.png'
const bannerHyperlinkUpdated = 'https://support.edapp.com/banners'
const bannerTitleUpdated = `Banner-Updated ${Date.now()}`

// banners sync is not working consistently - Learner is not able to see the new banner

xdescribe('Feature: Banners 🪧 ', () => {
  after('Clean up - Delete UG more than 24 hours old via API', () => {
    cy.loginLMS(adminEmail, password)
    getUserGroupsIdsFromEmily().then(groups => {
      groups.forEach(groupId => {
        const userGroupAge = timeDiffInHours(Date.now(), Number(groupId))
        userGroupAge > 24
          ? deleteUserGroupsIdsFromEmily(groupId)
          : cy.log('No UGs more than 24 hours old')
      })
    })
  })

  it('Admin Create a Banner in Engage and Publish it', () => {
    cy.loginLMS(adminEmail, password)

    //Create User Group
    userGroupName = `${Date.now()}`
    cy.createUserGroup(adminEmail, password, userGroupName)

    //Check empty state for banners
    cy.navigateTo('LMS', 'home')
    cy.get('#engage-menu-item').should('be.visible').click()
    cy.get('#banners-menu-item').should('be.visible').click()
    cy.url().should('include', '/banners')
    cy.contains('Use banners to display branding or highlight specific content in the app').should(
      'be.visible'
    )
    cy.contains('Drag banners in the order you want them displayed in the app.').should(
      'be.visible'
    )
    cy.contains('A maximum of 20 banners will be visible to users.').should('be.visible')

    //Create a banner
    cy.getByButtonText('Create a banner').click()
    cy.url().should('include', '/banner/new')
    cy.getByButtonText('Save Changes').should('be.disabled')

    cy.getByPlaceHolderText('Banner Label').type(bannerTitle)
    cy.getByPlaceHolderText('Banner Label').should('have.value', bannerTitle)

    cy.getByButtonText('Save Changes').should('be.disabled')

    cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')

    cy.getByTestId('uploadImageButton')
      .attachFile(bannerImage)
      .wait('@imageUploaded')
      .then(uploadResponse => {
        cy.task('setValue', { bannerImageId: uploadResponse.response.body.public_id })
        bannerImageId = uploadResponse.response.body.public_id
      })

    cy.getByButtonText('Save Changes').should('be.enabled')
    cy.getByTestId('removeButton').should('exist')

    cy.getByPlaceHolderText('optional').type('invalidLink')
    cy.contains('Invalid URL. Must be a full URL with preceding http/s').should('be.visible')

    cy.getByPlaceHolderText('optional').clearAndType(bannerHyperlink)
    cy.contains('Invalid URL. Must be a full URL with preceding http/s').should('not.exist')

    cy.intercept('POST', '/api/banners').as('bannerCreated')
    cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')

    cy.getByTestId('banner-status').contains('Hidden', { matchCase: false }).should('be.visible')
    cy.getByTestId('PublishToggle-Checkbox').forceClick()
    cy.getByTestId('banner-status').contains('Visible', { matchCase: false }).should('be.visible')

    cy.getByPlaceHolderText('Banner Label').clear()

    cy.getByButtonText('Save Changes').click().wait('@bannerCreated')
    cy.getByPlaceHolderText('Banner Label').should('have.value', bannerTitle)
    cy.getByClassNameLike('StyledCrumbLinkText').should('contain.text', bannerTitle)

    cy.getByClassNameLike('StyledCrumbLinkText').first().click()
    cy.getByClassNameLike('CardDetails').should('contain.text', bannerTitle)
  })

  it('Learner Should be able to see the Banner', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.get(`[alt="${bannerTitle}"]`)
      .should('be.visible')
      .and('have.attr', 'src')
      .and('contain', bannerImageId)
    cy.getByClassNameLike('LinkIcon').first().should('be.visible').click()
  })

  it('Admin should go to Banners and Edit Banner', () => {
    cy.navigateTo('LMS', '/banners')

    cy.intercept('GET', '/api/banners/*').as('bannerRead')

    //set banner id
    cy.getByTestIdLike('content-card-contents')
      .contains(bannerTitle)
      .should('be.visible')
      .forceClick()
      .wait('@bannerRead')
      .then(res => {
        bannerId = res.response.body.id
      })

    cy.getByPlaceHolderText('optional').clearAndType(bannerHyperlinkUpdated)
    cy.getByTestId('removeButton').should('exist').forceClick()

    cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')

    cy.getByTestId('uploadImageButton')
      .attachFile(bannerImageUpdated)
      .wait('@imageUploaded')
      .then(uploadResponse => {
        cy.task('setValue', { bannerImageUpdatedId: uploadResponse.response.body.public_id })
        bannerImageUpdatedId = uploadResponse.response.body.public_id
      })

    cy.getByPlaceHolderText('Banner Label').clear().type(bannerTitleUpdated, { delay: 100 })

    cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
    cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

    cy.getByClassNameLike('StyledCrumbLinkText').first().click()
    cy.getByClassNameLike('CardDetails').should('contain.text', bannerTitleUpdated)
  })

  it('Learner Should be able to see the updated Banner', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)
    // confirm Banner was updated via api GET /api/banners/sync
    getBanner(adminEmail, password, bannerTitleUpdated).then(() => {
      cy.reload()

      cy.get(`[alt="${bannerTitleUpdated}"]`)
        .should('be.visible')
        .and('have.attr', 'src')
        .and('contain', bannerImageUpdatedId)
      cy.getByClassNameLike('LinkIcon').first().should('be.visible').click()
    })
  })

  it('Admin Should go to Banners and update Access Rules', () => {
    cy.navigateTo('LMS', '/banners')

    cy.intercept('GET', '/api/banners/*').as('bannerRead')
    cy.intercept('GET', 'api/usergroups').as('userGroupsRead')

    cy.getByTestId(`content-card-contents-${bannerId}`).should('be.visible')
    cy.getByTestId(`content-card-contents-${bannerId}`).forceClick().wait('@bannerRead')

    cy.getByTestId('SettingsLink').click().wait('@userGroupsRead')
    cy.getByTestId('checkbox-visible').click()
    // Select User Group
    cy.getByPlaceHolderText('Search for a user group').type(userGroupName)
    cy.getByTestId('selectable-list-item').contains(userGroupName).click()
    cy.getByTestId('close-setting-dialog-button').forceClick()

    cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
    cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

    // verify selected User Group
    cy.getByTestId('SettingsLink').click().wait('@userGroupsRead')
    cy.getByTestId('selectable-list-box-selected').should('contain.text', userGroupName)
  })

  it('Learner should NOT be able to see the Banner as a Learner', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    // confirm Banner was updated via api GET /api/banners/sync
    getBanner(adminEmail, password).then(() => {
      cy.reload()
      cy.get(`[alt="${bannerTitleUpdated}"]`).should('not.exist')
    })
  })

  it('Admin should go to Banners and Remove Banner', () => {
    cy.navigateTo('LMS', '/banners')

    cy.getByTestId(`content-card-contents-${bannerId}`)
      // .getByClassNameLike('BottomActionsArea')
      .find('[data-testid="cardDeleteButton"]')
      .should('be.visible')
      .forceClick()

    cy.getByTestId('dialog')
      .should('be.visible')
      .and('contain.text', 'Are you sure you want to delete this banner?')

    cy.intercept({ method: 'DELETE', url: `/api/banners/${bannerId}` }).as('bannerDeleted')

    cy.getByTestId('dialog')
      .should('be.visible')
      .getByButtonText('Delete')
      .should('be.enabled')
      .click()
      .wait('@bannerDeleted')

    cy.getByTestId(`content-card-contents-${bannerTitleUpdated}`).should('not.exist')
  })

  it('Learner Should NOT be able to see the Banner as a Learner', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)
    // confirm Banner was updated via api GET /api/banners/sync
    getBanner(adminEmail, password).then(() => {
      cy.reload()

      cy.get(`[alt="${bannerTitleUpdated}"]`).should('not.exist')
    })
  })
})
