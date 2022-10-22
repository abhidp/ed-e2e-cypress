import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

let adminEmail: string
let learnerEmail: string
let assignmentId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseName = 'ED-16801-Course'
const assignmentName = 'ED-16801-Assignment-Access-Dates'
const startDateTime = dayjs().utc().add(1, 'week')
const endDateTime = dayjs().utc().add(2, 'weeks')

describe('Assignment Access Dates', () => {
  describe('As LMS Admin', () => {
    it('Create an Assignment with start date 1 week in the future', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])

      const assignmentAccessDates = { planning: { startDateTime, endDateTime } }

      cy.createCourseAndAssignment(
        adminEmail,
        password,
        courseName,
        assignmentName,
        true,
        true,
        assignmentAccessDates
      ).then(res => {
        assignmentId = res.assignmentId
        cy.task('setValue', { learnerEmail, assignmentId })
      })
    })
  })

  describe('As Learner, access the Assignment', () => {
    it('Should not be able to access Assignment before the start date', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)
        assignmentId = value.assignmentId

        const availableDate = startDateTime.format('dddd D MMMM, YYYY')

        cy.contains(courseName).forceClick()
        cy.getByTestId(`card-${assignmentId}`).forceClick()

        cy.getByTestId('detail assignment')
          .should('be.visible')
          .and('contain.text', 'This lesson is locked')
          .and('contain.text', `This lesson will be available on ${availableDate}`)
      })
    })
  })
})
