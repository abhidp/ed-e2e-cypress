import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const webAPP = Cypress.env('LEARNERS_APP')
const preReqCourse = 'ED-16769-PreReq'
const secondaryCourse = 'ED-16769-Course1'
const preReqLinkedCourse = 'Linked-Translated-Course'

const locale = 'de'
let secondaryCourseId: string
let preReqLinkedCourseId: string
let translatedCourseId: string

xdescribe('Course Pre-Req', () => {
  describe('As LMS Admin, setup course Pre-req', () => {
    it('Create LMS Admin Account with 3 published Courses including 1 linked translated course', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.createCourse(adminEmail, password, preReqCourse, true)

      cy.createCourse(adminEmail, password, secondaryCourse, true).then(courseId => {
        secondaryCourseId = `${courseId}`
      })

      cy.createCourse(adminEmail, password, preReqLinkedCourse, true)
        .then(courseId => {
          preReqLinkedCourseId = `${courseId}`
        })
        .then(() => {
          // Create Linked AI translated Course
          cy.createLinkedTranslatedCourse(
            adminEmail,
            password,
            preReqLinkedCourseId,
            locale,
            true
          ).then(courseId => {
            translatedCourseId = courseId
          })

          cy.navigateTo('LMS', 'courseware')
          cy.contains(preReqCourse).should('be.visible')
          cy.contains(secondaryCourse).should('be.visible')
          cy.contains(preReqLinkedCourse).should('be.visible')

          //Create learner
          learnerEmail = `edappt+learner+${adminEmail}`
          cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
          cy.task('setValue', { learnerEmail })
        })
    })

    it('Should be navigating to original course access rules tab from linked course prerequisites', () => {
      const preReqCourseList = [secondaryCourse, preReqCourse]

      cy.intercept('GET', `/api/courses/${preReqLinkedCourseId}`).as('originalCourse')

      cy.navigateTo('LMS', `v2/course/${translatedCourseId}/settings/access-rules`)
      cy.getByTestId('prerequisitesCard')
        .contains('Original Course Access Rules tab')
        .click()
        .wait('@originalCourse')

      cy.url().should('include', `v2/course/${preReqLinkedCourseId}/settings/access-rules`)

      cy.getByTestId('selectable-list-box-unselected').should('contain.text', preReqCourseList[0])
      cy.getByTestId('selectable-list-box-unselected').should('contain.text', preReqCourseList[1])
    })

    it('Add Prerequisites to secondary course', () => {
      const preReqCourseList = [`${preReqLinkedCourse} ( 2 languages )`, preReqCourse]

      cy.navigateTo('LMS', `v2/course/${secondaryCourseId}/settings/access-rules`)

      cy.intercept('PUT', `/api/courses/*/prerequisites`).as('courseUpdated')

      cy.getByTestId('selectable-list-box-unselected').should('contain.text', preReqCourseList[0])
      cy.getByTestId('selectable-list-box-unselected').should('contain.text', preReqCourseList[1])

      preReqCourseList.forEach(element => {
        cy.getByTestId('prerequisitesCard')
          .find('[data-testid="selectable-list-filter-input"]')
          .type(element)
        cy.getByTestId('selectable-list-box-unselected')
          .contains(element)
          .click()
          .wait('@courseUpdated')
        cy.reload()
        cy.getByTestId('selectable-list-box-selected').should('contain', element)
      })
    })
  })

  describe('As Learner, access secondary course', () => {
    beforeEach('Enable lx new home screen feature flag', () => {
      mockFeatureFlags([{ key: 'lx-new-home', value: true }])
    })

    it('Should not be able to access secondary course without completing pre-req', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      //Navigate to Library tab where all courses are shown
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.getByTestId('tab-label-library').click().wait(500)
      cy.contains(secondaryCourse).forceClick()
      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'This course is locked')
        .and(
          'contain.text',
          `To access this course, you need to complete ${preReqLinkedCourse} and ${preReqCourse}`
        )

      cy.getByButtonText('OK').click()
      cy.getByTestId('dialog').should('not.be.visible')
    })

    it('Should show the translated course as prerequiste when browser language is changed', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })
      //Switch the browser language to Deutch
      cy.visit(webAPP, {
        onBeforeLoad(win) {
          Object.defineProperty(win.navigator, 'language', {
            value: locale
          })
        }
      })

      cy.getByTestId('tab-label-durchsuchen').click()
      cy.contains(secondaryCourse).should('be.visible').click()
      cy.getByTestId('dialog').should('be.visible').and(
        'contain.text',
        // `Dieser Kurs ist gesperrtUm auf diese Kurs zuzugreifen, mÃ¼ssen Sie ${preReqLinkedCourse} - de and ${preReqCourse} abschlieÃŸen.OK`,
        `Dieser Kurs ist gesperrtUm auf diese Kurs zuzugreifen, müssen Sie ${preReqLinkedCourse} - de and ${preReqCourse} abschließen.OK`
      )

      cy.getByButtonText('OK').click()
      cy.getByTestId('dialog').should('not.be.visible')
    })
  })
})

function value(value: any, arg1: (this: Cypress.ObjectLike, String: unknown) => void) {
  throw new Error('Function not implemented.')
}
