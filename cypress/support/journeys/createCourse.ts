import {
  createAssignmentFromHippo,
  createCourseFromHippo,
  createDiscussionFromHippo,
  createLessonFromHippo,
  createSlideFromEmily,
  SlideSubstitutionMap
} from '../helper/api-helper'

export const createCourse = (
  adminEmail: string,
  adminPassword: string,
  courseTitle: string,
  publish?: boolean,
  extraCoursePayload?: object
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    return createCourseFromHippo(
      tokenResponse.body.token,
      courseTitle,
      publish,
      extraCoursePayload
    ).then(courseResponse => {
      return `${courseResponse.body.id}`
    })
  })
}

export const createCourseAndLesson = (
  adminEmail: string,
  adminPassword: string,
  courseTitle: string,
  lessonTitle: string,
  coursePublish?: boolean,
  lessonPublish?: boolean,
  extraLessonPayload?: object,
  extraCoursePayload?: object
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    return createCourseFromHippo(
      tokenResponse.body.token,
      courseTitle,
      coursePublish,
      extraCoursePayload
    ).then(courseResponse => {
      return createLessonFromHippo(
        tokenResponse.body.token,
        courseResponse.body.id,
        lessonTitle,
        lessonPublish,
        extraLessonPayload
      ).then(response => {
        return { lessonId: response.body.id, courseId: courseResponse.body.id }
      })
    })
  })
}

export const createCourseLessonAndSlide = (
  adminEmail: string,
  adminPassword: string,
  courseTitle: string,
  lessonTitle: string,
  coursePublish?: boolean,
  lessonPublish?: boolean,
  slideSubstitutionMap?: SlideSubstitutionMap
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    return createCourseFromHippo(tokenResponse.body.token, courseTitle, coursePublish).then(
      courseResponse => {
        return createLessonFromHippo(
          tokenResponse.body.token,
          courseResponse.body.id,
          lessonTitle,
          lessonPublish
        )
          .then(lessonResponse => {
            return createSlideFromEmily(
              lessonResponse.body.id,
              courseResponse.body.id,
              slideSubstitutionMap
            )
          })
          .then(response => {
            return {
              lessonId: (response as any).body._id,
              courseId: (response as any).body.course,
              slideId: (response as any).slideId
            }
          })
      }
    )
  })
}

export const createCourseAndDiscussion = (
  adminEmail: string,
  adminPassword: string,
  courseTitle: string,
  discussionTitle: string,
  coursePublish?: boolean,
  discussionPublish?: boolean,
  extraDiscussionPayload?: object
) => {
  return cy.getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    return createCourseFromHippo(tokenResponse.body.token, courseTitle, coursePublish).then(
      courseResponse => {
        return createDiscussionFromHippo(
          tokenResponse.body.token,
          courseResponse.body.id,
          discussionTitle,
          discussionPublish,
          extraDiscussionPayload
        ).then(discussionId => {
          return { discussionId, courseId: courseResponse.body.id }
        })
      }
    )
  })
}

export const createCourseAndAssignment = (
  adminUser: string,
  adminPassword: string,
  courseTitle: string,
  assignmentTitle: string,
  coursePublish?: boolean,
  assignmentPublish?: boolean,
  extraAssignmentPayload?: object
) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    return createCourseFromHippo(tokenResponse.body.token, courseTitle, coursePublish).then(
      courseResponse => {
        return createAssignmentFromHippo(
          tokenResponse.body.token,
          courseResponse.body.id,
          assignmentTitle,
          assignmentPublish,
          extraAssignmentPayload
        ).then(assignmentId => {
          return { assignmentId, courseId: courseResponse.body.id }
        })
      }
    )
  })
}
