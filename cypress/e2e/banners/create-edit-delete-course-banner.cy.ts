import { createName, createEmail, select } from 'cypress/support/helper/common-util'
import { mockFeatureFlags } from 'cypress/support/helper/api-helper'

const password = Cypress.env('COMMON_TEST_PASSWORD')
const bannerTitle = 'Course-Banner'
const bannerImage = 'prizing/prize-background.jpg'
const courseName = 'course-name'
const draftCourseName = 'draft-course-name'

const selectors = {
  engageMenu: '#engage-menu-item',
  bannerMenu: '#banners-menu-item',

  bannerPreviewTitleTestId: 'banner-preview-title',
  bannerStatusTestId: 'banner-status',
  radioCourseBannerTestId: 'radio-course-banner',
  customiseCheckboxTestId: 'checkbox-visible',
  publishToggleTestId: 'PublishToggle-Checkbox',
  courseSelectPlaceholder: 'Search for a course',
  uploadImageTestId: 'uploadImageButton',
  courseAccessRulesToggleTestId: 'toggle-universal-access',

  selectedValue: '[class*=ed-select__single-value]'
}

describe('Feature: Course Banners 🪧 ', () => {
  describe('As LMS admin setup Course Banner, as a Learner check the Banner', () => {
    it('Create a Course Banner with Link in Engage and Publish it', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      //Create admin
      const adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      //Create Course
      cy.createCourse(adminEmail, password, courseName, true).then(courseId => {
        cy.task('setValue', { courseId })
      })
      cy.createCourse(adminEmail, password, draftCourseName, false).then(draftCourseId => {
        cy.task('setValue', { draftCourseId })
      })

      const userGroupName = createName()
      cy.createUserGroup(adminEmail, password, userGroupName)

      // Create Learner
      const learnerEmail = `edappt+learner+${adminEmail}`
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail, adminEmail, password, userGroupName })

      //Check empty state for banners
      cy.navigateTo('LMS', 'home')
      cy.get(selectors.engageMenu).click()
      cy.get(selectors.bannerMenu).click()
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

      cy.getByTestId(selectors.radioCourseBannerTestId).forceClick()

      select(selectors.courseSelectPlaceholder, courseName)
      cy.getByTestId(selectors.bannerPreviewTitleTestId)
        .contains(/featured course/i)
        .siblings()
        .contains(courseName)

      cy.intercept('POST', '/api/banners').as('bannerCreated')
      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')

      cy.getByTestId(selectors.bannerStatusTestId)
        .contains(/hidden/i)
        .should('be.visible')
      cy.getByTestId(selectors.publishToggleTestId).forceClick()
      cy.getByTestId(selectors.bannerStatusTestId)
        .contains(/visible/i)
        .should('be.visible')

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
        expect(banner).contain(courseName)

        cy.task('getValue').then(value => {
          cy.get(`a[href='#course/${value.courseId}']`)
            .should('be.visible')
            .contains(/featured course/i)
            .siblings()
            .contains(courseName)
            .click()
          cy.url().should('include', `course/${value.courseId}`)
        })
      })
    })
  })

  describe('As LMS admin customise Course Banner Branding', () => {
    it('Should Edit Banner, and Customise Banner Branding', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')

      cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

      cy.getByTestId(selectors.radioCourseBannerTestId).should('be.checked')

      cy.getByTestId(selectors.customiseCheckboxTestId).click()

      cy.intercept('POST', '/v1_1/edapp/upload').as('imageUploaded')
      cy.getByTestId(selectors.uploadImageTestId)
        .attachFile(bannerImage)
        .wait('@imageUploaded')
        .then(uploadResponse => {
          cy.task('setValue', { customBannerImageId: uploadResponse.response.body.public_id })
        })

      cy.task('getValue').then(value => {
        cy.getByTestId(selectors.bannerPreviewTitleTestId)
          .parent()
          .should('have.css', 'background-image')
          .and('match', new RegExp(value.customBannerImageId, 'i'))
      })
      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
      cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')
    })

    it('Should be able to see custom Course Banner branding as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).contain(courseName)

        cy.task('getValue').then(value => {
          cy.get(`a[href='#course/${value.courseId}']`)
            .children()
            .first()
            .should('have.css', 'background-image')
            .and('match', new RegExp(value.customBannerImageId, 'i'))
        })
      })
    })
  })

  describe('As LMS admin change Course Banner with draft course', () => {
    it('Should Edit Banner, and select draft course', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')

      cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

      cy.getByTestId(selectors.radioCourseBannerTestId).should('be.checked')

      select(courseName, draftCourseName)

      cy.get(selectors.selectedValue).contains(/draft/i)
      cy.getByTestId(selectors.bannerPreviewTitleTestId).contains(draftCourseName)

      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
      cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')
    })

    it('Should not be able to see Course Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner.length).to.eq(0)

        cy.task('getValue').then(value => {
          cy.get(`a[href='#course/${value.courseId}']`).should('not.exist')
        })
      })
    })
  })

  describe('As LMS admin Edit Course Banner access', () => {
    it('Should Navigate to Course Access Rules', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

      cy.navigateTo('LMS', '/banners')

      cy.intercept('GET', '/api/banners/*').as('bannerRead')

      cy.getByButtonText('Edit Banner').should('be.visible').forceClick().wait('@bannerRead')

      cy.getByTestId(selectors.radioCourseBannerTestId).should('be.checked')

      select(draftCourseName, courseName)

      cy.intercept('PUT', '/api/banners/*').as('bannerUpdated')
      cy.getByButtonText('Save Changes').click().wait('@bannerUpdated')

      cy.task('getValue').then(value => {
        cy.get(`a[href='/banner/${value.bannerId}/settings/access-rules']`).click()
        cy.contains(
          'This banner will display to all users assigned to the corresponding course. To update these settings, edit your course.'
        ).should('be.visible')
        cy.get(`a[href='/v2/course/${value.courseId}/settings/access-rules']`)
          .click()
          .url()
          .should('include', `v2/course/${value.courseId}/settings/access-rules`)

        cy.intercept('PUT', '**/usergroups').as('userGroupUpdate')
        cy.getByTestId(selectors.courseAccessRulesToggleTestId).click().wait('@userGroupUpdate')
        // Select User Group
        cy.getByPlaceHolderText('Search by user group').type(value.userGroupName, { delay: 100 })

        cy.intercept('PUT', '**/usergroups').as('userGroupUpdate')
        cy.getByTestId('selectable-list-item')
          .contains(value.userGroupName)
          .click()
          .wait('@userGroupUpdate')
      })
    })

    it('Should not be able to see Course Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner.length).to.eq(0)

        cy.task('getValue').then(value => {
          cy.get(`a[href='#course/${value.courseId}']`).should('not.exist')
        })
      })
    })
  })

  describe('As LMS admin Remove Banner, as a Learner check that the Banner does not exist', () => {
    it('Should go to Banners and Remove Banner', () => {
      mockFeatureFlags([{ key: 'lx-course-banner', value: true }])

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

        cy.getByTestId(`content-card-contents-${bannerTitle}`).should('not.exist')
      })
    })

    it('Should NOT be able to see the Banner as a Learner', () => {
      cy.intercept('GET', '/api/banners/sync*').as('bannerSync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      cy.wait('@bannerSync').then(({ response }) => {
        const banner = response.body.map(banner => banner.title)
        expect(banner).not.contain(courseName)
      })
      cy.get(`[alt="${courseName}"]`).should('not.exist')
    })
  })
})
