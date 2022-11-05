import { createName, createEmail } from 'cypress/support/helper/common-util'
import { mockFeatureFlags } from 'cypress/support/helper/api-helper'

const password = Cypress.env('COMMON_TEST_PASSWORD')
const bannerTitle = 'ED-16798-Banner'
const bannerImage = 'prizing/prize-background.jpg'
const bannerHyperlink = 'https://support.edapp.com/'
const bannerImageUpdated = 'courses/certificateLogo.png'
const bannerHyperlinkUpdated = 'https://support.edapp.com/banners'
const bannerTitleUpdated = 'ED-16798-Banner-updated'

/**
 * we don't want to lose the e2e capability for banners while
 * create-edit-delete-banner.cy.ts is getting its updated
 * see: https://bitbucket.org/ed-app/ed/pull-requests/9426
 **/
describe('Feature: Custom Banners 🪧 ', () => {
  describe('As LMS admin setup banner, as a Learner check the Banner', () => {
    it('Create a Custom Banner with Link in Engage and Publish it', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      //Create admin
      const adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      //Create User Group
      const userGroupName = createName()
      cy.createUserGroup(adminEmail, password, userGroupName)

      // Create Learner
      const learnerEmail = `edappt+learner+${adminEmail}`
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail, adminEmail, password, userGroupName })

      //Check empty state for banners
      cy.navigateTo('LMS', 'home')
      cy.get('#engage-menu-item').click()
      cy.get('#banners-menu-item').click()
      cy.url().should('include', '/banners')
      cy.contains(
        'Use banners to display branding or highlight specific content in the app'
      ).should('be.visible')
      cy.contains('Drag banners in the order you want them displayed in the app.').should(
        'be.visible'
      )
      cy.contains('A maximum of 20 banners will be visible to users.').should('be.visible')

      //Create a banner
      cy.getByButtonText('Create a banner').click()
      cy.url().should('include', '/banner/new')
      cy.getByButtonText('Save Changes').should('be.disabled')

      cy.getByPlaceHolderText('Banner Label').type(bannerTitle).blur()
      cy.getByButtonText('Save Changes').should('be.disabled')

      cy.getByTestId('radio-link-banner').should('be.checked')

      cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')
      cy.getByTestId('uploadImageButton')
        .attachFile(bannerImage)
        .wait('@imageUploaded')
        .then(uploadResponse => {
          cy.task('setValue', { bannerImageId: uploadResponse.response.body.public_id })
        })

      cy.getByButtonText('Save Changes').should('be.enabled')
      cy.getByTestId('removeButton').should('exist')

      cy.getByName('hyperlink').type('invalidLink')
      cy.contains('Invalid URL. Must be a full URL with preceding http/s').should('be.visible')

      cy.getByName('hyperlink').clearAndType(bannerHyperlink)
      cy.contains('Invalid URL. Must be a full URL with preceding http/s').should('not.exist')

      cy.intercept('POST', '/api/banners').as('bannerCreated')
      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')

      cy.getByTestId('banner-status')
        .contains(/hidden/i)
        .should('be.visible')
      cy.getByTestId('PublishToggle-Checkbox').forceClick()
      cy.getByTestId('banner-status')
        .contains(/visible/i)
        .should('be.visible')

      cy.getByPlaceHolderText('Banner Label').clear()

      cy.getByButtonText('Save Changes')
        .click()
        .wait('@bannerCreated')
        .then(({ response }) => {
          cy.task('setValue', { bannerId: response.body })
        })

      cy.getByPlaceHolderText('Banner Label').should('have.value', bannerTitle)
      cy.getByClassNameLike('StyledCrumbLinkText').should('contain.text', bannerTitle)

      cy.getByClassNameLike('StyledCrumbLinkText').first().click()
      cy.getByClassNameLike('CardDetails').should('contain.text', bannerTitle)
      cy.getByTestIdLike('content-card-contents').should('have.lengthOf', 1)
    })

    it('Should be able to see the Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).contain(bannerTitle)
      })

      cy.task('getValue').then(value => {
        cy.get(`[alt="${bannerTitle}"]`)
          .should('be.visible')
          .and('have.attr', 'src')
          .and('contain', value.bannerImageId)
        cy.getByTestId('link-icon').should('be.visible')
      })
    })
  })

  describe('As LMS admin Edit Banner to have no hyperlink, as a leaner check updated banner has no link', () => {
    it('Should Edit Banner, and Clear Banner Hyperlink', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')

      cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

      cy.getByTestId('radio-link-banner').should('be.checked')

      cy.getByName('hyperlink').clear()

      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
      cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

      cy.getByClassNameLike('StyledCrumbLinkText').first().click()
      cy.getByClassNameLike('CardDetails').should('contain.text', bannerTitle)
      cy.getByTestIdLike('content-card-contents').should('have.lengthOf', 1)
    })

    it('Should be able to see Banner without link as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).contain(bannerTitle)
      })

      cy.task('getValue').then(value => {
        cy.get(`[alt="${bannerTitle}"]`)
          .should('be.visible')
          .and('have.attr', 'src')
          .and('contain', value.bannerImageId)
      })
      cy.getByTestId('link-icon').should('not.exist')
    })
  })

  describe('As LMS admin Edit banner, as a Learner check updated Banner', () => {
    it('Should go to Banners and Edit Banner', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')

      //set banner id
      cy.getByTestIdLike('content-card-contents').should('be.visible')
      cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

      cy.getByTestId('radio-link-banner').should('be.checked')

      cy.getByName('hyperlink').clearAndType(bannerHyperlinkUpdated)
      cy.getByTestId('removeButton').should('exist').forceClick()

      cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')
      cy.getByTestId('uploadImageButton')
        .attachFile(bannerImageUpdated)
        .wait('@imageUploaded')
        .then(uploadResponse => {
          cy.task('setValue', { bannerImageUpdatedId: uploadResponse.response.body.public_id })
        })

      cy.getByPlaceHolderText('Banner Label').clear().type(bannerTitleUpdated, { delay: 100 })

      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
      cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

      cy.getByClassNameLike('StyledCrumbLinkText').first().click()
      cy.getByClassNameLike('CardDetails').should('contain.text', bannerTitleUpdated)
      cy.getByTestIdLike('content-card-contents').should('have.lengthOf', 1)
    })

    it('Should be able to see the updated Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).contain(bannerTitleUpdated)
      })

      cy.task('getValue').then(value => {
        cy.get(`[alt="${bannerTitleUpdated}"]`)
          .should('be.visible')
          .and('have.attr', 'src')
          .and('contain', value.bannerImageUpdatedId)
      })

      cy.getByTestId('link-icon').should('be.visible')
    })
  })

  describe('As LMS admin Edit an access, as a Learner check that the Banner is not accessible', () => {
    it('Should go to Banners and update Access Rules', () => {
      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')
      cy.intercept('GET', 'api/usergroups').as('userGroupsRead')

      cy.task('getValue').then(value => {
        cy.getByTestId(`content-card-contents-${value.bannerId}`).should('be.visible')
        cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

        cy.getByTestId('SettingsLink').click().wait('@userGroupsRead')
        cy.getByTestId('checkbox-visible').click()
        // Select User Group
        cy.getByPlaceHolderText('Search for a user group').type(value.userGroupName)
        cy.getByTestId('selectable-list-item').contains(value.userGroupName).click()
        cy.getByTestId('close-setting-dialog-button').forceClick()

        cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
        cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

        // verify selected User Group
        cy.getByTestId('SettingsLink').click().wait('@userGroupsRead')
        cy.getByTestId('selectable-list-box-selected').should('contain.text', value.userGroupName)
      })
    })

    it('Should NOT be able to see the Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).not.contain(bannerTitleUpdated)
      })

      cy.get(`[alt="${bannerTitleUpdated}"]`).should('not.exist')
    })
  })

  describe('As LMS admin Remove Banner, as a Learner check that the Banner does not exist', () => {
    it('Should go to Banners and Remove Banner', () => {
      cy.navigateTo('LMS', '/banners')

      cy.task('getValue').then(value => {
        cy.getByTestId(`content-card-contents-${value.bannerId}`).should('be.visible')

        cy.getByClassNameLike('BottomActionsArea')
          .find('[data-testid="cardDeleteButton"]')
          .should('be.visible')
          .forceClick()

        cy.getByTestId('dialog')
          .should('be.visible')
          .and('contain.text', 'Are you sure you want to delete this banner?')

        cy.intercept({ method: 'DELETE', url: `/api/banners/${value.bannerId}` }).as(
          'bannerDeleted'
        )

        cy.getByTestId('dialog')
          .should('be.visible')
          .getByButtonText('Delete')
          .should('be.enabled')
          .click()
          .wait('@bannerDeleted')

        cy.getByTestId(`content-card-contents-${bannerTitleUpdated}`).should('not.exist')
      })
    })

    it('Should NOT be able to see the Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).not.contain(bannerTitleUpdated)
      })
      cy.get(`[alt="${bannerTitleUpdated}"]`).should('not.exist')
    })
  })
})
