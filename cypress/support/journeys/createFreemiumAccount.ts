import { createEmail } from '../helper/common-util'
import { createFreemiumAccountFromHippo, completeTutorialFromHippo } from '../helper/api-helper'

export const createFreemiumAccount = (companyName?: string, email?: string) => {
  if (!email) {
    email = createEmail()
  }
  if (!companyName) {
    companyName = 'E2E test'
  }

  return createFreemiumAccountFromHippo(companyName, email).then(registerReponse => {
    const { redirect, token } = registerReponse.body
    cy.visit(redirect)
    return completeTutorialFromHippo(token)
  })
}
