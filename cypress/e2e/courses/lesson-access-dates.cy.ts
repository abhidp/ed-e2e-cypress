import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

let lessonId: string
let adminEmail: string
let learnerEmail: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseName = 'ED-16775-Course'
const lessonName = 'ED-16775-Lesson-Access-Dates'
const lessonStartDate = dayjs.utc().add(1, 'week')

describe('Lesson Access Dates', () => {
  describe('As LMS Admin', () => {
    it('Create a lesson with start date 1 week in the future', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)

      const lessonAccessDates = {
        planning: {
          startDateTime: lessonStartDate.toISOString(),
          endDateTime: lessonStartDate.toISOString()
        }
      }

      cy.createCourseAndLesson(
        adminEmail,
        password,
        courseName,
        lessonName,
        true,
        true,
        lessonAccessDates
      ).then(res => {
        lessonId = res.lessonId
        cy.task('setValue', { lessonId })
      })

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])
      cy.task('setValue', { learnerEmail })

      cy.navigateTo('LMS', 'courseware')
      cy.contains(courseName).should('be.visible')
    })
  })

  describe('As Learner, access the Lesson', () => {
    it('Should not be able to access Lesson before the start date', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)

        const availableDate = lessonStartDate.format('dddd D MMMM, YYYY')

        cy.contains(courseName).forceClick()
        cy.getByTestId(`card-${value.lessonId}`).click()

        cy.getByTestId('detail lesson')
          .should('be.visible')
          .and('contain.text', 'This lesson is locked')
          .and('contain.text', `This lesson will be available on ${availableDate}`)
      })
    })
  })
})
