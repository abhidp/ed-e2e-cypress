import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'

let adminEmail: string
const firstName = 'firstName'
const lastName = 'lastName'
const phone = '1300984245'
const address = '72 Foveaux St'
const city = 'Surry Hills'
const state = 'NSW'
const postcode = '2010'
let creditCardExpiryDate: string

const password = Cypress.env('COMMON_TEST_PASSWORD')
const cardNumber = Cypress.env('CARD_NUMBER')
const cardCVCode = Cypress.env('CARD_CV_CODE')

describe('Feature: Billing 💰 ', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/billing/summary').as('getBillingSummary')
    cy.intercept('GET', '/api/billing/plans').as('getBillingPlans')
    cy.intercept('PATCH', '/api/billing/customer').as('updateBillingCustomer')
    cy.intercept('GET', '/api/billing/customer').as('getBillingCustomer')
    cy.intercept('POST', '/api/billing/customer').as('postBillingCustomer')
    cy.intercept('GET', '/api/billing/invoice/latest').as('getBillingInvoiceLatest')
    cy.intercept('GET', '/api/billing/summary').as('getBillingSummary')
    cy.intercept('POST', '/api/billing/plan').as('postBillingPlan')
  })

  it('Should create free LMS account and update to EdApp Pro trial', () => {
    adminEmail = createEmail()
    cy.createLmsAccount(adminEmail, password)

    // verify free plan
    cy.navigateTo('LMS', '/account/billing').wait('@getBillingSummary')
    cy.getByTestId('planDetailTitle').last().should('have.text', 'Free')

    // try EdAPP Pro
    cy.getByButtonText('Try EdApp Pro').click().wait('@getBillingPlans')
    cy.url().should('include', '/subscribe/select-plan')

    cy.get('table')

    // select EdApp Pro Plus for free
    cy.contains('Plus').parent().find('button').click()
    cy.getByButtonText('Confirm').click().wait('@postBillingPlan')

    // verify Plus Free Trial
    cy.navigateTo('LMS', '/account/billing').wait('@getBillingSummary')
    cy.getByTestId('planDetailTitle').last().should('have.text', 'Plus')
    cy.contains('Free Trial')
  })

  it('Should go to billing and Buy plan after trial', () => {
    cy.navigateTo('LMS', '/account/billing').wait('@getBillingSummary')
    cy.getByButtonText('Buy now').click().wait(['@getBillingCustomer', '@getBillingInvoiceLatest'])

    cy.get('form')

    // provide Payment Details
    cy.get('input#first-name').click().type(firstName)
    cy.get('input#last-name').click().type(lastName)
    cy.get('input#phone').click().type(phone)
    cy.get('input#address').click().type(address)
    cy.get('input#city').click().type(city)
    cy.get('input#state').click().type(state)
    cy.get('input#postcode').click().type(postcode)

    // set future year
    creditCardExpiryDate = getFutureDateWithFormat(1)

    // provide card Details
    cy.get('#credit-card-number iframe')
      .iframe()
      .find('input[name="cardnumber"]')
      .forceClick()
      .type(cardNumber)
    cy.get('#credit-card-expiry iframe')
      .iframe()
      .find('input[name="exp-date"]')
      .forceClick()
      .type(creditCardExpiryDate)
    cy.get('#credit-card-cvc iframe')
      .iframe()
      .find('input[name="cvc"]')
      .forceClick()
      .type(cardCVCode)

    cy.getByButtonText('Confirm subscription')
      .click()
      .wait(['@postBillingCustomer', '@postBillingPlan'])
  })

  it('Should go to billing and Change Plan', () => {
    // verify Plus plan
    cy.navigateTo('LMS', '/account/billing').wait('@getBillingSummary')
    cy.getByTestId('planDetailTitle').last().should('have.text', 'Plus')

    // change plan
    cy.getByButtonText('Change my plan').click().wait('@getBillingPlans')
    cy.url().should('include', '/subscribe/select-plan')

    cy.get('table')

    // update to EdApp Growth
    cy.contains('Growth').parent().find('button').click()

    cy.getByButtonText('Proceed to payment').click()
    cy.url().should('include', '/subscribe/confirm')

    cy.getByButtonText('Confirm your subscription').click().wait('@postBillingPlan')
  })

  it('Should go to billing and Edit payment details', () => {
    // verify Growth plan
    cy.navigateTo('LMS', '/account/billing').wait('@getBillingSummary')
    cy.getByTestId('planDetailTitle').last().should('have.text', 'Growth')

    // change plan
    cy.getByButtonText('Change my plan').click().wait('@getBillingPlans')
    cy.url().should('include', '/subscribe/select-plan')

    cy.get('table')

    // select EdApp Pro Plus
    cy.contains('Plus').parent().find('button').click()

    cy.getByButtonText('Proceed to payment').click()
    cy.url().should('include', '/subscribe/confirm')

    //edit
    cy.get('[href="/account/billing/edit"]').click().wait('@getBillingInvoiceLatest')

    cy.get('form')

    // provide Payment Details
    cy.get('input#first-name').click().type('UpdatedFirstName')
    cy.get('input#last-name').click().type(lastName)
    cy.get('input#phone').click().type(phone)
    cy.get('input#address').click().type(address)
    cy.get('input#city').click().type(city)
    cy.get('input#state').click().type(state)
    cy.get('input#postcode').click().type(postcode)

    // set future year
    creditCardExpiryDate = getFutureDateWithFormat(2)

    // provide card Details
    cy.get('#credit-card-number iframe')
      .iframe()
      .find('input[name="cardnumber"]')
      .forceClick()
      .type(cardNumber)
    cy.get('#credit-card-expiry iframe')
      .iframe()
      .find('input[name="exp-date"]')
      .forceClick()
      .type(creditCardExpiryDate)
    cy.get('#credit-card-cvc iframe')
      .iframe()
      .find('input[name="cvc"]')
      .forceClick()
      .type(cardCVCode)

    cy.getByButtonText('Save payment details').click().wait('@updateBillingCustomer')

    cy.getByButtonText('Confirm your subscription').click().wait('@postBillingPlan')
  })
})

function getFutureDateWithFormat(year: number, format = 'MM/YY') {
  return dayjs().add(year, 'y').format(format)
}
