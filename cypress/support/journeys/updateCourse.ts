/*
  Update course settings
*/

import { addUserGroupToCourseFromHippo } from '../helper/api-helper'

export const addUserGroupToCourse = (
  email: string,
  password: string,
  courseId: string,
  userGroups: Array<string>,
  universalAccess: boolean
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return addUserGroupToCourseFromHippo(token, userGroups, courseId, universalAccess)
  })
}
