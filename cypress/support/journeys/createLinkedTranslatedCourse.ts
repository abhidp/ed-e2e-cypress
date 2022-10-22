import { createLinkedAITranslatedCourse, getUserTokenFromHippo } from '../helper/api-helper'

export const createLinkedTranslatedCourse = (
  email: string,
  password: string,
  courseId: string,
  locale: string,
  linkTranslation: boolean
) => {
  return getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return createLinkedAITranslatedCourse(token, courseId, locale, linkTranslation).then(
      courseResponse => {
        return `${courseResponse.body.id}`
      }
    )
  })
}
