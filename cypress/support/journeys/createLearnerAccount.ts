import {
  getPublicApiTokenFromHippo,
  createUserPublicApiFromHippo,
  createLearnerFromHippo
} from '../helper/api-helper'

export const createLearnerAccount = (
  adminEmail: string,
  adminPassword: string,
  learnerEmail: string,
  learnerPassword: string,
  learnerRoles: string[],
  firstName?: string,
  lastName?: string,
  name?: string,
  learnerUserGroups?: string[],
  sendWelcomeEmail?: boolean,
  passwordChangeRequired?: boolean
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const accountOwnerToken = tokenResponse.body.token
    return getPublicApiTokenFromHippo(accountOwnerToken).then(publicTokenResponse => {
      const publicApiToken: string = publicTokenResponse.body

      return createUserPublicApiFromHippo(
        publicApiToken,
        learnerEmail,
        learnerPassword,
        learnerRoles,
        firstName,
        lastName,
        name,
        learnerUserGroups,
        sendWelcomeEmail,
        passwordChangeRequired
      )
    })
  })
}

export const createLearnerViaApi = (
  learnerEmail: string,
  learnerPassword: string,
  learnerRoles?: string[],
  passwordChangeRequired?: boolean
) => {
  return createLearnerFromHippo(learnerEmail, learnerPassword, learnerRoles, passwordChangeRequired)
}
