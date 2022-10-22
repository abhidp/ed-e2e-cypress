import {
  getLmsUserProfileFromHippo,
  createUserGroupFromEmily,
  getPublicApiTokenFromHippo,
  createUserGroupPublicApiFromHippo
} from '../helper/api-helper'

export const createUserGroup = (
  email: string,
  password: string,
  userGroupTitle: string,
  userGroupContains: 'users' | 'groups' = 'users'
) => {
  return getLmsUserProfileFromHippo(email, password).then(profileResponse => {
    const profile = profileResponse.body
    return createUserGroupFromEmily(userGroupTitle, profile.userApplicationId, userGroupContains)
  })
}

export const createUserGroupPublicApi = (
  adminEmail: string,
  adminPassword: string,
  userGroupName: string
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const accountOwnerToken = tokenResponse.body.token
    return getPublicApiTokenFromHippo(accountOwnerToken).then(publicTokenResponse => {
      const publicApiToken: string = publicTokenResponse.body

      return createUserGroupPublicApiFromHippo(publicApiToken, userGroupName)
    })
  })
}
