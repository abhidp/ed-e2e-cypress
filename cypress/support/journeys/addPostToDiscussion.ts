import { loginToLearnersApp, addDiscussionPostToLearnersAppFromHippo } from '../helper/api-helper'

export const addPostToDiscussionInLearnersApp = (
  email: string,
  password: string,
  discussionId: string,
  postContent: string
) => {
  return loginToLearnersApp(email, password).then(loginResponseBody => {
    addDiscussionPostToLearnersAppFromHippo(
      loginResponseBody.campus_token,
      discussionId,
      postContent
    )
  })
}
