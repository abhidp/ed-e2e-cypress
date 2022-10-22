import { getPublicApiTokenFromHippo, mockAllFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

const email = createEmail()
const adminEmail = `edappt+admin+${email}`
const firstName = getNameFromEmail(email).firstName
const lastName = getNameFromEmail(email).lastName
const username = `${firstName}${lastName}`
const externalIdentifier = Date.now().toString()
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'V1 API Deeplink Course'
const lessonTitle = 'V1 API Deeplink Lesson'

let adminApiToken: string
let userId: string
let learnerToken: string
let userGroupId: string
let lessonDeeplink: string
let courseId: string

describe('V1 API deeplink to Lesson', () => {
  beforeEach(() => {
    mockAllFeatureFlags([{ key: 'lx-new-course-2', value: true }])
  })

  it('Create LMS Admin account and get Admin API token', () => {
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)
    cy.createCourseLessonAndSlide(adminEmail, password, courseTitle, lessonTitle, true, true).then(
      response => {
        courseId = response.courseId
      }
    )

    cy.getUserTokenFromHippo(adminEmail, password).then(tokenResponse => {
      const accountOwnerToken = tokenResponse.body.token
      getPublicApiTokenFromHippo(accountOwnerToken).then(publicTokenResponse => {
        adminApiToken = publicTokenResponse.body
      })
    })
  })

  it('POST a Learner using V1 Public API', () => {
    const postUserOptions = {
      url: `${Cypress.env('PUBLIC_API')}/v1/users`,
      method: 'POST',
      body: { username, email, firstName, lastName, password, externalIdentifier },
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        Authorization: 'Bearer ' + adminApiToken
      }
    }

    cy.request(postUserOptions).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body.id).to.not.be.null
      userId = response.body.id
    })
  })

  it('GET learner token from V1 API using ExternalId', () => {
    //this is just to validate that endpoint for returning learner token is working
    const getLearnerToken = {
      url: `${Cypress.env('PUBLIC_API')}/v1/users/external/${externalIdentifier}/token`,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + adminApiToken
      }
    }

    cy.request(getLearnerToken).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body.token).to.not.be.null
      learnerToken = response.body.token
    })
  })

  it('GET learner token from V1 API using UserId', () => {
    //this is just to validate that endpoint for returning learner token is working
    const getLearnerToken = {
      url: `${Cypress.env('PUBLIC_API')}/v1/users/${userId}/token`,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + adminApiToken
      }
    }

    cy.request(getLearnerToken).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body.token).to.not.be.null
      learnerToken = response.body.token
    })
  })

  it('POST User Group from v1 API', () => {
    const postUserGroup = {
      url: `${Cypress.env('PUBLIC_API')}/v1/usergroups`,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + adminApiToken
      },
      body: {
        name: username,
        users: [userId],
        courses: [courseId],
        enableInviteCode: true,
        inviteCode: externalIdentifier
      }
    }

    cy.request(postUserGroup).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body.id).to.be.not.null
      userGroupId = response.body.id
    })
  })

  it('GET User Groups using v1 API', () => {
    const getUserGroup = {
      url: `${Cypress.env('PUBLIC_API')}/v1/usergroups`,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + adminApiToken
      }
    }

    cy.request(getUserGroup).then(response => {
      expect(response.status).to.equal(200)
      const userGroupExists = response.body.some(ug => ug['id'] === userGroupId)
      expect(userGroupExists).to.be.true
    })
  })
})
