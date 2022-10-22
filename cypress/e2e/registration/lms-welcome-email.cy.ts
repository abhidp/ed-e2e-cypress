import { getEmailFromMailgun } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string

const ENV = Cypress.env('NODE_ENV')
const mailgunDomain = Cypress.env(`${ENV}_MAILGUN_DOMAIN`)

const password = Cypress.env('COMMON_TEST_PASSWORD')
const subject = 'Welcome to EdApp!'
const sender = `EdApp <support@${mailgunDomain}>`
const templateName = 'ed-free-welcome'

describe('LMS - Welcome Email on Registration', () => {
  it('Register new account on LMS', () => {
    adminEmail = `qa+${createEmail('@edapp.com')}`
    cy.createLmsAccount(adminEmail, password)
  })

  it('Wait for Welcome Email from Mailgun', () => {
    getEmailFromMailgun(adminEmail, subject).then(response => {
      expect(response.template.name).to.eq(templateName)
      expect(response.message.headers.from).to.eq(sender)
      expect(response.message.headers.subject).to.eq(subject)
      expect(response.message.headers.to).to.eq(adminEmail)
    })
  })
})
