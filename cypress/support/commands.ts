/* eslint-disable @typescript-eslint/no-namespace */
import * as common from './helper/common-util'
import * as api from './helper/api-helper'
import { createLmsAccount } from './journeys/createLmsAccount'
import { createLearnerAccount, createLearnerViaApi } from './journeys/createLearnerAccount'
import { createUserGroup, createUserGroupPublicApi } from './journeys/createUserGroup'
import { enableLeaderboards } from './journeys/enableLeaderboards'
import { createPrizeDraw, createPrize, createPrizeDrawWithPrize } from './journeys/createPrizeDraw'
import {
  createCourseAndLesson,
  createCourse,
  createCourseLessonAndSlide,
  createCourseAndDiscussion,
  createCourseAndAssignment
} from './journeys/createCourse'
import { upgradeToEnterprisePlan, upgradePlanTo } from './journeys/upgradePlan'
import { createFreemiumAccount } from './journeys/createFreemiumAccount'
import { createNewCourseAndLesson } from './journeys/createCourseAndLesson'
import { loginToLearnersAppViaUI, loginToLearnersAppViaAPI } from './journeys/loginToLearnersApp'
import { addPostToDiscussionInLearnersApp } from './journeys/addPostToDiscussion'
import {
  createCourseCollection,
  addCoursesToCollection,
  deleteCourseCollection
} from './journeys/createCourseCollection'
import { updateAppSettings } from './journeys/updateAppSettings'
import {
  createCustomAchievement,
  earnAchievementOnLearnersApp,
  bulkDeleteAllCustomAchievement,
  updateCustomAchievement
} from './journeys/createCustomAchievement'
import { addUserGroupToCourse } from './journeys/updateCourse'
import 'cypress-file-upload'
import {
  addDefaultVideo,
  addCommentToVideo,
  deleteDefaultVideo,
  deleteCommentFromVideo
} from './journeys/createPeerAuthoring'
import { updateLesson } from './journeys/updateLesson'
import { createLinkedTranslatedCourse } from './journeys/createLinkedTranslatedCourse'
import { completeCourses, completeLessons } from './journeys/completeCourses'

/* ===  Custom Commands Type declaration  === */
declare global {
  namespace Cypress {
    interface Chainable {
      navigateTo: typeof common.navigateTo
      waitForRequest: typeof common.waitForRequest
      waitForMultipleRequests: typeof common.waitForMultipleRequests
      clearAllIndexDB: typeof common.clearAllIndexDB
      logOutLMS: typeof common.logOutLMS
      logOutLearner: typeof common.logOutLearner
      waitForDialogWindow: typeof common.waitForDialogWindow

      loginToLearnersApp: typeof api.loginToLearnersApp
      getUserTokenFromHippo: typeof api.getUserTokenFromHippo
      createIndividualLearnerFromHippo: typeof api.createIndividualLearnerFromHippo
      createPlaylist: typeof api.createPlaylistFromHippo
      addCoursesToPlaylist: typeof api.addCoursesToPlaylistFromHippo
      loginLMS: typeof api.loginLMS
      loginLmsViaApi: typeof api.loginLmsViaApi

      createLmsAccount: typeof createLmsAccount
      createLearnerAccount: typeof createLearnerAccount
      createLearnerViaApi: typeof createLearnerViaApi
      createUserGroup: typeof createUserGroup
      enableLeaderboards: typeof enableLeaderboards
      createPrizeDraw: typeof createPrizeDraw
      createPrize: typeof createPrize
      createPrizeDrawWithPrize: typeof createPrizeDrawWithPrize
      createCourse: typeof createCourse
      createCourseAndLesson: typeof createCourseAndLesson
      createCourseLessonAndSlide: typeof createCourseLessonAndSlide
      createCourseAndDiscussion: typeof createCourseAndDiscussion
      createCourseAndAssignment: typeof createCourseAndAssignment
      upgradeToEnterprisePlan: typeof upgradeToEnterprisePlan
      upgradePlanTo: typeof upgradePlanTo
      createFreemiumAccount: typeof createFreemiumAccount
      createNewCourseAndLesson: typeof createNewCourseAndLesson
      loginToLearnersAppViaUI: typeof loginToLearnersAppViaUI
      addPostToDiscussionInLearnersApp: typeof addPostToDiscussionInLearnersApp
      createCourseCollection: typeof createCourseCollection
      deleteCourseCollection: typeof deleteCourseCollection
      addCoursesToCollection: typeof addCoursesToCollection
      updateAppSettings: typeof updateAppSettings
      loginToLearnersAppViaAPI: typeof loginToLearnersAppViaAPI
      createCustomAchievement: typeof createCustomAchievement
      earnAchievementOnLearnersApp: typeof earnAchievementOnLearnersApp
      updateCustomAchievement: typeof updateCustomAchievement
      bulkDeleteAllCustomAchievement: typeof bulkDeleteAllCustomAchievement
      addUserGroupToCourse: typeof addUserGroupToCourse
      addDefaultVideo: typeof addDefaultVideo
      addCommentToVideo: typeof addCommentToVideo
      deleteDefaultVideo: typeof deleteDefaultVideo
      deleteCommentFromVideo: typeof deleteCommentFromVideo
      updateLesson: typeof updateLesson
      createLinkedTranslatedCourse: typeof createLinkedTranslatedCourse
      completeCourses: typeof completeCourses
      completeLessons: typeof completeLessons
      createUserGroupPublicApi: typeof createUserGroupPublicApi

      get(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable>
      ): Chainable<WaitXHR>

      forceClick(): Chainable<Element>
      iframe(): Chainable<Element>
      getByClassNameLike(classNameLike: string): Chainable<Element>
      getByButtonText(buttonText: string): Chainable<Element>
      getByTestId(dataTestId: string): Chainable<Element>
      getByTestIdLike(dataTestIdLike: string): Chainable<Element>
      getByPlaceHolderText(placeHolderText: string): Chainable<Element>
      getByValue(value: string): Chainable<Element>
      getByName(name: string): Chainable<Element>
      getByType(type: string): Chainable<Element>
      findByTestId(dataTestId: string): Chainable<Element>
      clearAndType(
        subject?: string | number | Date | boolean | RegExp,
        text?: string
      ): Chainable<Element>
      getTableRows: typeof common.getTableRows
    }

    type TypedResponse<T> = Omit<Response, 'body'> & {
      body: T
    }
  }
}

/* ===  Custom Commands register  === */

Cypress.Commands.overwrite('request', (request, options) => {
  if (!options.skipRequestOverride) {
    options.retryOnStatusCodeFailure = true
    options.retryOnNetworkFailure = true
  }

  return request(options)
})

Cypress.Commands.add('getByTestId', common.getByTestId)
Cypress.Commands.add('getByTestIdLike', common.getByTestIdLike)
Cypress.Commands.add('getByButtonText', common.getByButtonText)
Cypress.Commands.add('getByPlaceHolderText', common.getByPlaceHolderText)
Cypress.Commands.add('getByValue', common.getByValue)
Cypress.Commands.add('getByName', common.getByName)
Cypress.Commands.add('getByType', common.getByType)
Cypress.Commands.add('getByClassNameLike', common.getByClassNameLike)
Cypress.Commands.add('findByTestId', { prevSubject: true }, common.findByTestId)
Cypress.Commands.add('navigateTo', common.navigateTo)
Cypress.Commands.add('waitForRequest', common.waitForRequest)
Cypress.Commands.add('waitForMultipleRequests', common.waitForMultipleRequests)
Cypress.Commands.add('clearAllIndexDB', common.clearAllIndexDB)
Cypress.Commands.add('logOutLMS', common.logOutLMS)
Cypress.Commands.add('logOutLearner', common.logOutLearner)
Cypress.Commands.add('waitForDialogWindow', common.waitForDialogWindow)
Cypress.Commands.add('forceClick', { prevSubject: 'element' }, common.forceClick)
Cypress.Commands.add('iframe', { prevSubject: 'element' }, common.iframe)
Cypress.Commands.add('clearAndType', { prevSubject: true }, common.clearAndType)
Cypress.Commands.add('getTableRows', common.getTableRows)

Cypress.Commands.add('loginToLearnersApp', api.loginToLearnersApp)
Cypress.Commands.add('getUserTokenFromHippo', api.getUserTokenFromHippo)
Cypress.Commands.add('createUserGroup', api.createUserGroupFromEmily)
Cypress.Commands.add('createIndividualLearnerFromHippo', api.createIndividualLearnerFromHippo)
Cypress.Commands.add('createPlaylist', api.createPlaylistFromHippo)
Cypress.Commands.add('addCoursesToPlaylist', api.addCoursesToPlaylistFromHippo)
Cypress.Commands.add('loginLMS', api.loginLMS)
Cypress.Commands.add('loginLmsViaApi', api.loginLmsViaApi)
Cypress.Commands.add('createUserGroup', api.addUserGroupToCourseFromHippo)

Cypress.Commands.add('createLmsAccount', createLmsAccount)
Cypress.Commands.add('createLearnerAccount', createLearnerAccount)
Cypress.Commands.add('createLearnerViaApi', createLearnerViaApi)
Cypress.Commands.add('createUserGroup', createUserGroup)
Cypress.Commands.add('enableLeaderboards', enableLeaderboards)
Cypress.Commands.add('createPrizeDraw', createPrizeDraw)
Cypress.Commands.add('createPrize', createPrize)
Cypress.Commands.add('createPrizeDrawWithPrize', createPrizeDrawWithPrize)
Cypress.Commands.add('createCourse', createCourse)
Cypress.Commands.add('createCourseAndLesson', createCourseAndLesson)
Cypress.Commands.add('createCourseLessonAndSlide', createCourseLessonAndSlide)
Cypress.Commands.add('createCourseAndDiscussion', createCourseAndDiscussion)
Cypress.Commands.add('createCourseAndAssignment', createCourseAndAssignment)
Cypress.Commands.add('upgradeToEnterprisePlan', upgradeToEnterprisePlan)
Cypress.Commands.add('upgradePlanTo', upgradePlanTo)
Cypress.Commands.add('createFreemiumAccount', createFreemiumAccount)
Cypress.Commands.add('createNewCourseAndLesson', createNewCourseAndLesson)
Cypress.Commands.add('loginToLearnersAppViaUI', loginToLearnersAppViaUI)
Cypress.Commands.add('addPostToDiscussionInLearnersApp', addPostToDiscussionInLearnersApp)
Cypress.Commands.add('createCourseCollection', createCourseCollection)
Cypress.Commands.add('deleteCourseCollection', deleteCourseCollection)
Cypress.Commands.add('addCoursesToCollection', addCoursesToCollection)
Cypress.Commands.add('updateAppSettings', updateAppSettings)
Cypress.Commands.add('loginToLearnersAppViaAPI', loginToLearnersAppViaAPI)
Cypress.Commands.add('createCustomAchievement', createCustomAchievement)
Cypress.Commands.add('earnAchievementOnLearnersApp', earnAchievementOnLearnersApp)
Cypress.Commands.add('updateCustomAchievement', updateCustomAchievement)
Cypress.Commands.add('bulkDeleteAllCustomAchievement', bulkDeleteAllCustomAchievement)
Cypress.Commands.add('addUserGroupToCourse', addUserGroupToCourse)
Cypress.Commands.add('addDefaultVideo', addDefaultVideo)
Cypress.Commands.add('addCommentToVideo', addCommentToVideo)
Cypress.Commands.add('deleteDefaultVideo', deleteDefaultVideo)
Cypress.Commands.add('deleteCommentFromVideo', deleteCommentFromVideo)
Cypress.Commands.add('updateLesson', updateLesson)
Cypress.Commands.add('createLinkedTranslatedCourse', createLinkedTranslatedCourse)
Cypress.Commands.add('completeCourses', completeCourses)
Cypress.Commands.add('completeLessons', completeLessons)
Cypress.Commands.add('createUserGroupPublicApi', createUserGroupPublicApi)
export {}
