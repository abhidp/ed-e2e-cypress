import { createEmail } from 'cypress/support/helper/common-util'
import { getThomasIframe } from 'cypress/support/helper/utils'

const adminUser = createEmail()
const learnerEmail = `edappt+learner+${adminUser}`
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'AUTH-245-Course'
const lessonTitle = 'AUTH-245-lesson'
let lessonId: string

const Selectors = {
  thomasBackground: '#slides-view',
  fileInput: 'input[type="file"]',
  thomasImageBackground: '.device-browser',
  themeSelector: 'themeSelector',
  colorSelector: 'colorSelector',
  selectValue: 'ed-select__single-value',
  selectOption: 'ed-select__option'
}

const brandingCoverImage = 'courses/courseCover.jpg'

describe('Feature: Lesson Branding Theme', () => {
  describe('As LMS admin', () => {
    beforeEach('Define Network Calls', () => {
      cy.intercept('POST', 'https://api.cloudinary.com/v1_1/edapp/upload').as('imageUploaded')
      cy.intercept('GET', `/api/courses/*`).as('course')
    })
    it('Should create an account, learner, course and lesson', () => {
      //Create LMS account and upgrade to Enterprise plan
      cy.createLmsAccount(adminUser, password)
      cy.upgradeToEnterprisePlan(adminUser, password)

      //Create course and lesson
      cy.createCourseLessonAndSlide(adminUser, password, courseTitle, lessonTitle, true, true).then(
        response => {
          lessonId = response.lessonId
        }
      )

      //Create learner
      cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])
    })
    it('Should be able to open the theme branding modal', () => {
      cy.navigateTo('LMS', `/lesson/${lessonId}/edit`)
      cy.wait('@course')
      cy.getByButtonText('Theme').should('be.visible').click()
    })
    it('Should have the default theme on course and lesson', () => {
      cy.getByTestId('dialog-wrapper').within(() => {
        getThomasIframe('iframe-main')
          .find(Selectors.thomasBackground)
          .should('have.css', 'background-color', 'rgb(70, 180, 233)')

        cy.contains(lessonTitle).click()
        cy.getByTestId(Selectors.themeSelector)
          .getByClassNameLike(Selectors.selectValue)
          .should('contain', 'Course theme')
        getThomasIframe('iframe-main')
          .find(Selectors.thomasBackground)
          .should('have.css', 'background-color', 'rgb(70, 180, 233)')
      })
    })
    it('Should update the background when changing the colour scheme', () => {
      cy.getByTestId('dialog-wrapper').within(() => {
        // Wait for rerender
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.contains('Course theme').click().wait(500)
        cy.getByTestId(Selectors.colorSelector).getByClassNameLike(Selectors.selectValue).click()
        cy.getByTestId(Selectors.colorSelector)
          .getByClassNameLike(Selectors.selectOption)
          .eq(1)
          .click()

        getThomasIframe('iframe-main')
          .find(Selectors.thomasBackground)
          .should('have.css', 'background-color', 'rgb(78, 136, 210)')
      })
    })

    it('Changing the lesson background updates the lesson iframe', () => {
      cy.getByTestId('dialog-wrapper').within(() => {
        cy.contains(lessonTitle).click()
        cy.getByTestId(Selectors.themeSelector).getByClassNameLike(Selectors.selectValue).click()
        cy.getByTestId(Selectors.themeSelector)
          .getByClassNameLike(Selectors.selectOption)
          .contains('Custom lesson theme')
          .click()
      })
      cy.getByTestId('dialog-wrapper')
        .find(Selectors.fileInput)
        .should('have.length', 2)
        .each((el, index) => {
          cy.wrap(el).should('exist').attachFile(brandingCoverImage)

          cy.wait('@imageUploaded').then(({ response }) => {
            const url = (response.body.url as string).replace(
              'http://res.cloudinary.com/edapp/image/',
              'https://media.edapp.com/image/'
            )

            if (index === 0) {
              // Chrome won't let you test the actual image url since it is in an Iframe, it instead subs it out with the url of the Iframe instead of the image
              // leaving the above here so we can maybe test it in the future, maybe by seeing if the asset URL is loaded
              getThomasIframe('iframe-main').should('have.css', 'background-image')
            } else {
              getThomasIframe('iframe-main')
                .find('#lesson-header-title-logo')
                .should('have.attr', 'src')
                .should('include', url)
            }
          })
        })
    })
  })
})
