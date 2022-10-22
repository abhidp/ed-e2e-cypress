import {
  completeCoursesForUsersFromHippo,
  completeLessonsForUsersFromHippo
} from '../helper/api-helper'

export const completeCourses = (userIds: string, courseIds: string) => {
  return cy
    .getUserTokenFromHippo(Cypress.env('SUPER_ADMIN_EMAIL'), Cypress.env('SUPER_ADMIN_PASSWORD'))
    .then(tokenResponse => {
      const token = tokenResponse.body.token
      return completeCoursesForUsersFromHippo(token, userIds, courseIds)
    })
}

export const completeLessons = (userIds: string, lessonIds: string) => {
  return cy
    .getUserTokenFromHippo(Cypress.env('SUPER_ADMIN_EMAIL'), Cypress.env('SUPER_ADMIN_PASSWORD'))
    .then(tokenResponse => {
      const token = tokenResponse.body.token
      return completeLessonsForUsersFromHippo(token, userIds, lessonIds)
    })
}
