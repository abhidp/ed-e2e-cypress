import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

let adminEmail: string
let learnerEmail: string
let discussionId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseName = 'ED-16774-Course'
const discussionName = 'ED-16774-Discussion-Access-Dates'
const startDateTime = dayjs.utc().add(1, 'week')
const endDateTime = dayjs.utc().add(2, 'weeks')

describe('Discussion Access Dates', () => {
  describe('As LMS Admin', () => {
    it('Create a discussion with start date 1 week in the future', () => {
      adminEmail = createEmail()
      learnerEmail = `edappt+learner+${adminEmail}`

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      cy.createLearnerAccount(adminEmail, password, learnerEmail, password, ['app-user'])

      const discussionAccessDates = { planning: { startDateTime, endDateTime } }
      cy.createCourseAndDiscussion(
        adminEmail,
        password,
        courseName,
        discussionName,
        true,
        true,
        discussionAccessDates
      ).then(res => {
        discussionId = res.discussionId
        cy.task('setValue', { learnerEmail, discussionId })
      })

      // cy.task('setValue', { learnerEmail })
    })
  })

  describe('As Learner, access the Discussion', () => {
    it('Should not be able to access Discussion before the start date', () => {
      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmail, password)

        const availableDate = startDateTime.format('dddd D MMMM, YYYY')

        cy.contains(courseName).forceClick()
        cy.getByTestId(`card-${value.discussionId}`).click()

        cy.getByTestId('detail discussion')
          .should('be.visible')
          .and('contain.text', 'This lesson is locked')
          .and('contain.text', `This lesson will be available on ${availableDate}`)
      })
    })
  })
})
