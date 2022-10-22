import {
  addDefaultVideoToPeerSlide,
  addCommentToVideoForPeerSlide,
  deleteDefaultVideoFromPeerSlide,
  deleteCommentFromVideoForPeerSlide
} from '../helper/api-helper'

export const addDefaultVideo = (
  email: string,
  password: string,
  lessonId: string,
  slideId: string,
  videoURL: string,
  videoTitle: string,
  videoDescription: string
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return addDefaultVideoToPeerSlide(
      token,
      lessonId,
      slideId,
      videoURL,
      videoTitle,
      videoDescription
    )
  })
}

export const addCommentToVideo = (
  email: string,
  password: string,
  lessonId: string,
  slideId: string,
  mediaId: string,
  commentText: string
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return addCommentToVideoForPeerSlide(token, lessonId, slideId, mediaId, commentText)
  })
}

export const deleteDefaultVideo = (
  email: string,
  password: string,
  lessonId: string,
  slideId: string,
  mediaId: string
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return deleteDefaultVideoFromPeerSlide(token, lessonId, slideId, mediaId)
  })
}

export const deleteCommentFromVideo = (
  email: string,
  password: string,
  lessonId: string,
  slideId: string,
  mediaId: string,
  commentId: string
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    return deleteCommentFromVideoForPeerSlide(token, lessonId, slideId, mediaId, commentId)
  })
}
