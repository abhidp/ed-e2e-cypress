import { enableUserGroupFromHippo } from '../helper/api-helper'

export const enableLeaderboards = (adminUser: string, adminPassword: string) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    const accountOwnerToken = tokenResponse.body.token
    return enableUserGroupFromHippo(accountOwnerToken)
  })
}
