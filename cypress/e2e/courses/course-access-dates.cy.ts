import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

let adminEmail: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseName = 'ED-16770-Course-Dates'
const courseStartDate = dayjs().utc().add(1, 'week')

describe('Course Access Dates', () => {
  describe('As LMS Admin', () => {
    it('Create a Course with start date 1 week in the future', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])

      const courseAccessDates = {
        planning: {
          startDateTime: courseStartDate.toISOString(),
          endDateTime: courseStartDate.toISOString()
        }
      }

      cy.createCourse(adminEmail, password, courseName, true, courseAccessDates)

      cy.navigateTo('LMS', 'courseware')
      cy.contains(courseName).should('be.visible')

      cy.task('setValue', { learnerEmail })
    })
  })

  describe('As Learner, access the course', () => {
    it('Should not be able to access course without before the start date', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      })

      const availableDate = courseStartDate.format('dddd D MMMM, YYYY')

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.getByTestId('tab-label-library').click().wait(500)
      cy.contains(courseName).forceClick()
      cy.getByTestId('dialog')
        .should('be.visible')
        .and('contain.text', 'This course is locked')
        .and('contain.text', `This course will be available on ${availableDate}`)

      cy.getByButtonText('OK').click()
      cy.getByTestId('dialog').should('not.be.visible')
    })
  })
})
