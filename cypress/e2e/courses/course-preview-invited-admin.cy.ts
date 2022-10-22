import { createEmail } from 'cypress/support/helper/common-util'
import { inviteUsers } from 'cypress/support/helper/api-helper'
import { getPublicApiTokenFromHippo } from 'cypress/support/helper/api-helper'

let adminEmail: string
let invitedAdminEmail: string
let invitedAdminId: string
let courseId: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'ED-17683: Course'
const courseTitle2 = 'ED-17683: Course 2'

let publicToken: string

describe('Feature: Preview courseware via Invited Admin 🧐 ', () => {
  it('Create LMS, courses and invite admin via API', () => {
    adminEmail = createEmail()

    // create LMS -> upgrate to Enterpise Plan
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)

    // create 2 courses: Published and Drafted
    cy.createCourse(adminEmail, password, courseTitle, true).then(id => (courseId = id))
    cy.createCourse(adminEmail, password, courseTitle2, false)

    // invite user
    invitedAdminEmail = `invite+${adminEmail}`
    inviteUsers(adminEmail, password, invitedAdminEmail, true, true).then(response => {
      const token = response.token

      // set publicToken
      getPublicApiTokenFromHippo(token).then(publicTokenResponse => {
        publicToken = publicTokenResponse.body
      })
    })
  })

  describe('Update password for invited Admin via API', () => {
    it('Update password for invited Admin via API', () => {
      // get users where username=invitedAdminEmail
      const getUsers = {
        url: `${Cypress.env('PUBLIC_API')}/v2/users?username=${encodeURIComponent(
          invitedAdminEmail
        )}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          Authorization: 'Bearer ' + publicToken
        }
      }
      cy.request(getUsers)
        .then(response => {
          expect(response.status).to.equal(200)
          invitedAdminId = response.body.items[0].id
        })
        .then(() => {
          // update password for invitedAdmin
          const putUser = {
            url: `${Cypress.env('PUBLIC_API')}/v2/users/${invitedAdminId}`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Accept: '*/*',
              Authorization: 'Bearer ' + publicToken
            },
            body: {
              password: password
            }
          }
          cy.request(putUser).then(response => {
            expect(response.status).to.equal(200)
          })
        })
    })

    describe('Preview courseware via Invited Admin', () => {
      it('Preview courseware via Invited Admin', () => {
        cy.loginToLearnersAppViaUI(invitedAdminEmail, password)

        cy.navigateTo('LEARNERS_APP', `/#home`)

        // verify status of the courses for invitedAdmin
        cy.getByTestId(`CourseCard-${courseId}`).should('exist').and('be.visible')
      })
    })
  })
})
