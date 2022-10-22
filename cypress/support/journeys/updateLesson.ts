/*
  Update lesson
*/

import { updateLessonFromHippo } from '../helper/api-helper'

export const updateLesson = (
  email: string,
  password: string,
  courseId: string,
  lessonId: string,
  lessonTitle: string
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return updateLessonFromHippo(token, courseId, lessonId, lessonTitle)
  })
}
