import {
  createCourseCollectionFromHippo,
  addCoursesToCollectionFromHippo,
  deleteCourseCollectionFromHippo
} from '../helper/api-helper'

export const createCourseCollection = (
  adminUser: string,
  adminPassword: string,
  collectionTitle: string
) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    return createCourseCollectionFromHippo(tokenResponse.body.token, collectionTitle).then(
      collectionResponse => {
        return collectionResponse.body
      }
    )
  })
}

export const deleteCourseCollection = (
  adminUser: string,
  adminPassword: string,
  collectionId: string,
  cascade?: boolean
) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    return deleteCourseCollectionFromHippo(tokenResponse.body.token, collectionId, cascade).then(
      collectionResponse => {
        return collectionResponse.body
      }
    )
  })
}
export const addCoursesToCollection = (
  adminUser: string,
  adminPassword: string,
  courseCollectionId: string,
  courseId: string
) => {
  return cy.getUserTokenFromHippo(adminUser, adminPassword).then(tokenResponse => {
    return addCoursesToCollectionFromHippo(tokenResponse.body.token, courseCollectionId, courseId)
  })
}
