import { createDeputyAccount } from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'
import { getNameFromEmail } from 'cypress/support/helper/utils'

const password = Cypress.env('COMMON_TEST_PASSWORD')
const lmsUrl = Cypress.env('LMS')
const hippoIntegrationsUrl = `${Cypress.env('HIPPO')}/api/integrations`

let email,
  firstName,
  lastName,
  dpCookie = {},
  deputyIntegrationUrl: string,
  options = {
    lmsUrl,
    browser: Cypress.browser,
    cookies: [],
    deputyCookie: {},
    hippoIntegrationsUrl
  }

describe('Deputy Integration', () => {
  beforeEach(() => {
    cy.intercept(hippoIntegrationsUrl).as('integrations')
    cy.intercept({
      method: 'PUT',
      url: `${hippoIntegrationsUrl}/deputy/disable`
    }).as('disconnected')
  })

  it('Create Deputy Account via API, and validate "NOT CONNECTED" state', () => {
    email = createEmail()
    firstName = getNameFromEmail(email).firstName
    lastName = getNameFromEmail(email).lastName

    createDeputyAccount(email, firstName, lastName, lastName)

    cy.createLmsAccount(email, password)

    cy.navigateTo('LMS', 'integrations')

    cy.getByTestId('integration-card-deputy')
      .should('contain.text', 'Not connected')
      .click()
      .wait('@integrations')
      .then(integrations => {
        cy.getByButtonText('Connect Deputy').should('exist').and('be.visible').and('be.enabled')
        cy.navigateTo('LMS', 'integrations').url().should('include', 'integrations')

        const integrationsList = integrations.response.body

        integrationsList.forEach(integration => {
          if (integration.name == 'Deputy') {
            expect(integration.enabled).to.equal(false, 'Deputy integration NOT ENABLED')

            deputyIntegrationUrl = integration.redirectUrl
            options.deputyConnectUrl = integration.redirectUrl
            cy.task('setValue', { deputyIntegrationUrl })

            const DPoptions = {
              method: 'GET',
              url: deputyIntegrationUrl,
              headers: {
                accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
              }
            }

            cy.request(DPoptions).then(response => {
              const DPSID = response.requestHeaders.cookie.split(';').shift().split('=').pop()

              dpCookie = {
                name: 'DPSID',
                value: DPSID,
                path: '/',
                domain: 'once.deputy.com',
                secure: true,
                httpOnly: true,
                sameSite: 'lax',
                expiry: Date.now() + 100000
              }

              options.cookies.push(dpCookie)
            })
          }
        })
      })

    cy.getCookies().then(cookies => {
      options.cookies.push(...cookies)
    })
  })

  it('Complete Deputy Integration in Puppeteer, and validate "CONNECTED" state', () => {
    cy.task('deputyConnect', options).then(() => {
      cy.navigateTo('LMS', 'integrations').wait('@integrations')
      cy.getByTestId('integration-card-deputy').should('contain.text', 'Connected').click()

      cy.getByButtonText('Account connected').should('exist').and('be.visible').and('be.disabled')
    })
  })

  it('Disconnect Deputy Integration and validate validate "NOT CONNECTED" state', () => {
    cy.navigateTo('LMS', 'integrations/deputy').wait('@integrations')

    cy.get(`a:contains("Disconnect Deputy")`).should('be.visible').click()
    cy.contains('Disconnect Deputy?').should('be.visible')
    cy.contains('Disconnecting your account will stop all current data syncing').should(
      'be.visible'
    )

    cy.getByButtonText('Yes, disconnect').click().wait('@disconnected')

    cy.getByTestId('dialog').should(
      'contain.text',
      'Your Deputy account has been successfully disconnected.'
    )

    cy.getByButtonText('Back').click()
    cy.reload().wait('@integrations')
    cy.getByButtonText('Connect Deputy').should('exist').and('be.visible').and('be.enabled')
  })
})
