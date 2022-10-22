import {
  getLmsUserProfileFromHippo,
  upgradeAccountToEnterpriseFromHippo,
  upgradePlanFromHippo
} from '../helper/api-helper'

export const upgradeToEnterprisePlan = (adminUser: string, adminPassword: string) => {
  const deliveryEnterprisePlusPlanId = 'dc0d68b7-7887-48aa-85e4-26e2c96ded29'

  return cy
    .getUserTokenFromHippo(Cypress.env('SUPER_ADMIN_EMAIL'), Cypress.env('SUPER_ADMIN_PASSWORD'))
    .then(tokenResponse => {
      const adminToken = tokenResponse.body.token
      return getLmsUserProfileFromHippo(adminUser, adminPassword).then(profileResponse => {
        const profile = profileResponse.body
        return upgradeAccountToEnterpriseFromHippo(
          adminToken,
          profile.userApplicationId,
          deliveryEnterprisePlusPlanId
        )
      })
    })
}

export const upgradePlanTo = (adminUser: string, adminPassword: string, plan: string) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    return upgradePlanFromHippo(tokenResponse.body.token, plan)
  })
}
