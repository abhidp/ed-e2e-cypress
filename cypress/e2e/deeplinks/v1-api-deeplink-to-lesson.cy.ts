import { getPublicApiTokenFromHippo, mockAllFeatureFlags } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

const email = createEmail()
const adminEmail = `edappt+admin+${email}`
const firstName = getNameFromEmail(email).firstName
const lastName = getNameFromEmail(email).lastName
const name = firstName + ' ' + lastName
const externalIdentifier = Date.now()
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'V1 API Deeplink Course'
const lessonTitle = 'V1 API Deeplink Lesson'

let adminApiToken: string
let userId: string
let learnerToken: string
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

  it('POST a Learner using V2 Public API', () => {
    const postUserOptions = {
      url: `${Cypress.env('PUBLIC_API')}/v2/users`,
      method: 'POST',
      body: { name, email, firstName, lastName, externalIdentifier, password },
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

  it(`GET Deeplink LaunchURI of Lesson using Learner's ExternalId`, () => {
    const getCourseDetails = {
      method: 'GET',
      url: `${Cypress.env('PUBLIC_API')}/v1/users/external/${externalIdentifier}/courses`,
      headers: {
        Authorization: 'Bearer ' + adminApiToken,
        Accept: '*/*'
      }
    }

    cy.request(getCourseDetails).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body).to.not.be.null

      lessonDeeplink = response.body[0].lessons[0].launchURI
    })
  })

  it('Visit Lesson Deeplink URL without logging in', () => {
    cy.intercept('POST', '/api/Interactions/batch').as('batch')

    cy.visit(lessonDeeplink)
    // cy.get('#lesson-title').should('contain.text', lessonTitle)
    cy.getByTestId('lessonTitle').should('contain.text', lessonTitle)

    cy.getByTestId('start-lesson').click().wait('@batch')
    cy.wait(7000)

    cy.get('#lesson-iframe').iframe().as('lesson')
    cy.get('@lesson').contains('Ok, let’s go!').should('be.visible').click().wait('@batch')
  })

  it('Restrict To Lesson screen in Deeplink should not have Back button', () => {
    const restrictToLessonScreenDeepLink = `${lessonDeeplink}&restrictToLessonScreen=true`

    cy.visit(restrictToLessonScreenDeepLink)
    cy.getByTestId('lessonTitle').should('contain.text', lessonTitle)
    cy.getByTestId('go-back-button').should('not.exist')
  })

  it('Restrict To Course screen in Deeplink should have Back button on Lesson Screen but not on Course screen', () => {
    const restrictToCourseScreenDeepLink = `${lessonDeeplink}&restrictToCourseScreen=true`

    cy.visit(restrictToCourseScreenDeepLink)
    cy.getByTestId('lessonTitle').should('contain.text', lessonTitle)

    cy.url().should('include', `#course/${courseId}`)

    cy.getByTestId('courseTitle').should('contain.text', courseTitle)
    cy.getByTestId('go-back-button').should('not.exist')
  })
})
