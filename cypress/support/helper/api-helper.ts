/* 
    naming convention for functions : <action>From<Servicename> 
    eg. createCourseFromHippo, createSlideFromEmily
*/

import {
  Achievement,
  DeeplinkResponseType,
  DeepLinksLesson,
  DeepLinksResponse,
  UserProfileType
} from './types'
import { getNameFromEmail, getNestedFormData } from './utils'
import createASlideRequest from '../../fixtures/api-request-body/create-slide.json'
import {
  defaultCourse,
  defaultPrizingAppSettings,
  addDefaultNewPrizeToDraw,
  defaultPrizeDraw,
  defaultNewPrize,
  defaultNewPlaylist,
  defaultCustomAchievement
} from './constants'
import { uuidv4 } from './common-util'

export const getCSRFTokenFromEmily = () => {
  const emilyUrl = Cypress.env('LMS')
  return cy
    .request({ method: 'GET', url: `${emilyUrl}/login` })
    .its('body')
    .then(body => {
      const $html = Cypress.$(body)
      const csrf = $html.find('input[name=_csrf]').val()
      return csrf
    })
}

export const registerNewAccountFromHippo = (
  email: string,
  password: string,
  type: 'trial' | 'learner'
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/register/${type}`,
    body: { email, password }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Registered new LMS account with email: ${email}`)
  })
}

export enum UserType {
  'AUTHOR' = 'content-author',
  'ADMIN' = 'ed-admin',
  'SAFETYCULTURE_ADMIN' = 'safety-culture-admin',
  'ACC_OWNER' = 'account-owner',
  'ACC_ADMIN' = 'account-admin',
  'SEO_ADMIN' = 'seo-admin',
  'ANALYTICS_MANAGER' = 'manager-analytics',
  'APP_USER' = 'app-user',
  'PRIZING_USER' = 'prizing-user',
  'EXCLUDE_FROM_ANALYTICS' = 'exclude-from-analytics',
  'HIDDEN_USER' = 'hidden-user',
  'REVIEWER' = 'reviewer',
  'DEMO_USER' = 'demo-user',
  'FACILITATOR' = 'facilitator',
  'INDIVIDUAL_LEARNER' = 'individual-learner',
  'BETA_TESTER' = 'beta-tester',
  'ANONYMOUS_USER' = 'anonymous-user'
}
export const registerNewLMSUser = (
  email: string,
  password: string,
  applicationId: string,
  roles: UserType[]
) => {
  return getCSRFTokenFromEmily().then(csrfToken => {
    const emilyLMSUrl = Cypress.env('LMS')
    const body = {
      'appuser._id': 'new',
      'appuser.app': applicationId,
      'appuser.password': password,
      'appuser.name': email,
      'roles.ed-admin.assigned': 'off',
      'roles.safety-culture-admin.assigned': 'off',
      'roles.account-owner.assigned': 'off',
      'roles.account-admin.assigned': 'off',
      'roles.seo-admin.assigned': 'off',
      'roles.manager-analytics.assigned': 'off',
      'roles.app-user.assigned': 'off',
      'roles.prizing-user.assigned': 'off',
      'roles.exclude-from-analytics.assigned': 'off',
      'roles.hidden-user.assigned': 'off',
      'roles.reviewer.assigned': 'off',
      'roles.demo-user.assigned': 'off',
      'roles.facilitator.assigned': 'off',
      'roles.individual-learner.assigned': 'off',
      'roles.beta-tester.assigned': 'off',
      'roles.anonymous-user.assigned': 'off',
      'roles.content-author.assigned': 'off',
      'appuser.profile.postcodeAU': '',
      'appuser.profile.compliance': 'off',
      'appuser.externalIdentifier': '',
      _csrf: csrfToken
    }

    roles.forEach(role => {
      body[`roles.${role}.assigned`] = 'on'
    })

    const options = {
      method: 'POST',
      url: `${emilyLMSUrl}/user/save`,
      body: body,
      form: true,
      headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.equal(200, `Registered new LMS user with email: ${email}`)
    })
  })
}

export const lockLessonByUser = (
  courseId: string,
  lessonId: string,
  user: string,
  password: string
) => {
  return getUserTokenFromHippo(user, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    const hippoUrl = Cypress.env('HIPPO')
    return cy.clearCookies().then(() => {
      return cy
        .request({
          method: 'PUT',
          url: `${hippoUrl}/api/lesson-authoring/${courseId}/lock/${lessonId}`,
          headers: { token, cookie: `password=${password}; email=${user}` },
          body: {
            durationInMinutes: 5
          }
        })
        .then(response => {
          expect(response.status).to.equal(
            200,
            `Lesson locked with id: ${lessonId} by user: ${user}`
          )
        })
    })
  })
}
export const lockLesson = (courseId: string, lessonId: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/lesson-authoring/${courseId}/lock/${lessonId}`,
    body: {
      durationInMinutes: 5
    }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Lesson locked with id: ${lessonId} by user: ${user}`)
  })
}

export const createIndividualLearnerFromHippo = (email: string, password: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/register/learner`,
    body: { email, password }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Learner created with email: ${email}`)
  })
}

export const createUserPublicApiFromHippo = (
  publicApiToken: string,
  email: string,
  password: string,
  roles: string[],
  firstName?: string,
  lastName?: string,
  name?: string,
  userGroups?: string[],
  sendWelcomeEmail?: boolean,
  passwordChangeRequired?: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/v2/users`,
    body: {
      email,
      password,
      roles,
      externalIdentifier: '',
      name: name || email,
      username: email,
      firstName: firstName || getNameFromEmail(email).firstName,
      lastName: lastName || getNameFromEmail(email).lastName,
      userGroups,
      userGroupsManaged: [],
      customFields: {},
      sendWelcomeEmail,
      passwordChangeRequired: passwordChangeRequired || false
    },
    headers: { Authorization: `Bearer ${publicApiToken}` }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Public user created with email: ${email}`)
  })
}

export const createLearnerFromHippo = (
  email: string,
  password: string,
  roles?: string[],
  passwordChangeRequired?: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const firstName = getNameFromEmail(email).firstName
  const lastName = getNameFromEmail(email).lastName

  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/register/learner`,
    body: {
      email,
      password,
      roles,
      externalIdentifier: '',
      name: `${firstName} ${lastName}`,
      username: `${firstName}.${lastName}`,
      firstName,
      lastName,
      userGroups: [],
      userGroupsManaged: [],
      customFields: {},
      passwordChangeRequired: passwordChangeRequired || false
    }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Learner created via API: ${email}`)
  })
}

export const getPublicApiTokenFromHippo = (
  token: string
): Cypress.Chainable<Cypress.TypedResponse<string>> => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/accounts/public-api-token`,
    headers: { token }
  }

  return cy.request(options)
}

export const getUserTokenFromHippo = (
  userName: string,
  userPassword: string
): Cypress.Chainable<Cypress.TypedResponse<{ token: string }>> => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/authentication/get-token`,
    body: { userName, userPassword }
  }

  return cy.request(options)
}

export const getLmsUserProfileFromHippo = (
  email: string,
  password: string
): Cypress.Chainable<Cypress.TypedResponse<UserProfileType>> => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(email, password).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'GET',
      url: `${hippoUrl}/api/users/me`,
      body: {},
      headers: { token }
    }

    return cy.request(options)
  })
}

export const completeTutorialFromHippo = (token: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/accounts/tutorial`,
    body: { hasSeenLesson: true },
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, 'Tutorial Completed')
  })
}

export const loginLmsViaApi = (nameOrEmail: string, password: string) => {
  const emilyUrl = Cypress.env('LMS')

  getCSRFTokenFromEmily().then(_csrf => {
    const options = {
      method: 'POST',
      url: `${emilyUrl}/login`,
      form: true,
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: { nameOrEmail, password, _csrf }
    }

    cy.request(options).then(response => {
      expect(response.status).to.equal(200, `Logged in to LMS with email: ${nameOrEmail}`)
    })
  })
}

export const loginLMS = (email: string, password: string) => {
  cy.intercept('POST', '/login').as('login')
  cy.navigateTo('LMS', 'login', true)
  cy.get('form').within(() => {
    cy.get('input[name="nameOrEmail"]').clear().type(email)
    cy.get('input[name="password"]').clear().type(password)
    cy.get('button[id="btn-login"]')
      .click()
      .wait('@login')
      .its('response.statusCode')
      .should('equal', 200)
  })
}

export const deleteAchievementFromHippo = (token: string, idList: string[]) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'DELETE',
    url: `${hippoUrl}/api/custom-achievements`,
    body: idList,
    headers: { token }
  }
  return cy.request(options).then(deleteAchievementResponse => {
    expect(deleteAchievementResponse.status).to.equal(204, `Custom Achievements deleted from Hippo`)
    return deleteAchievementResponse.status
  })
}

export const getAchievementListFromHippo = (token: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'GET',
    url: `${hippoUrl}/api/custom-achievements`,
    headers: { token }
  }
  return cy.request(options).then(getAchievementListResponse => {
    expect(getAchievementListResponse.status).to.equal(
      200,
      `Custom Achievements list fetched from Hippo`
    )
    return getAchievementListResponse.body
  })
}

export const createAchievementFromHippo = (
  token: string,
  title: string,
  status: string,
  isPublished: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/custom-achievements`,
    body: { ...defaultCustomAchievement, status, title, isPublished },
    headers: { token }
  }
  return cy.request(options).then(createAchievementResponse => {
    expect(createAchievementResponse.status).to.equal(
      200,
      `Custom Achievement created from Hippo with id: ${createAchievementResponse.body.id})}`
    )
    return createAchievementResponse.body
  })
}

export const updateAchievementFromHippo = (token: string, body: Achievement) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/custom-achievements`,
    body: body,
    headers: { token }
  }
  return cy.request(options).then(updateAchievementResponse => {
    expect(updateAchievementResponse.status).to.equal(
      200,
      `Custom Achievement updated from Hippo with id: ${updateAchievementResponse.body.id})}`
    )
    return updateAchievementResponse.body
  })
}

export const getCustomAchievementFromHippo = (token: string, id: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'GET',
    url: `${hippoUrl}/api/custom-achievements/${id}`,
    headers: { token }
  }
  return cy.request(options).then(getAchievementResponse => {
    expect(getAchievementResponse.status).to.equal(
      200,
      `Custom Achievement details fetched from Hippo with id: ${getAchievementResponse.body.id})}`
    )
    return getAchievementResponse.body
  })
}

export const loginToLearnersApp = (email: string, password: string) => {
  const emilyApiUrl = Cypress.env('EMILY_API')
  const { host } = new URL(emilyApiUrl)
  const options = {
    method: 'POST',
    url: `${emilyApiUrl}/api/login`,
    headers: { host },
    body: {
      username: email,
      password,
      appVersion: 'automation-tests',
      locale: 'en-GB'
    },
    form: true
  }

  return cy.request(options).then(loginResponse => {
    expect(loginResponse.status).to.equal(200)
    return loginResponse.body
  })
}

export const enableUserGroupFromHippo = (token: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/accounts/appFeatures`,
    body: { leaderboardEnabled: true },
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, 'Learderboards Enabled')
  })
}

export const createUserGroupFromEmily = (
  groupTitle: string,
  appId: string,
  userGroupContains: 'users' | 'groups'
) => {
  const emilyLMSUrl = Cypress.env('LMS')
  const id = 'new'
  const options = {
    method: 'POST',
    url: `${emilyLMSUrl}/v2/user-group/${id}/save`,
    body: getNestedFormData(
      {
        _id: id,
        usergroup: {
          _id: id,
          app: appId,
          name: groupTitle,
          userGroupContains
        }
      },
      ''
    ),
    headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `User group: ${groupTitle} created`)
  })
}

export const getUserGroupsIdsFromEmily = () => {
  const ugIds: string[] = []
  const emilyLMSUrl = Cypress.env('LMS')
  const options = {
    method: 'GET',
    url: `${emilyLMSUrl}/user-groups`
  }

  return cy
    .request(options)
    .its('body')
    .then(html => {
      const $tr = Cypress.$(html).find('tr')

      $tr.each(function (i, element) {
        if (element.id) ugIds.push(element.id)
      })
      return ugIds
    })
}

export const deleteUserGroupsIdsFromEmily = (ugId: string) => {
  const ugIds: string[] = []
  const emilyLMSUrl = Cypress.env('LMS')
  const options = {
    method: 'POST',
    url: `${emilyLMSUrl}/user-group/${ugId}/remove`
  }

  cy.request(options).then(response => {
    expect(response.status).to.equal(200, `UserGroup: ${ugId} deleted`)
  })
}

export const addUserGroupToCourseFromHippo = (
  token: string,
  userGroups: Array<string>,
  courseId: string,
  universalAccess: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/courses/${courseId}/usergroups`,
    headers: { token },
    body: { universalAccess, userGroups }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `User groups ${userGroups} added to Course: ${courseId}`)
  })
}

export const updateAppSettingsFromEmily = (appId: string) => {
  const emilyLMSUrl = Cypress.env('LMS')

  return getCSRFTokenFromEmily().then(csrfToken => {
    const options = {
      method: 'POST',
      url: `${emilyLMSUrl}/app-settings`,
      body: {
        _csrf: csrfToken,
        user_application: appId,
        ...defaultPrizingAppSettings
      }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.eq(200, `App-Settings updated for application: ${appId}`)
    })
  })
}

export const createPrizeDrawFromEmily = (prizeDraw: object, appId: string) => {
  const emilyLMSUrl = Cypress.env('LMS')

  return getCSRFTokenFromEmily().then(csrfToken => {
    const options = {
      method: 'POST',
      url: `${emilyLMSUrl}/draw/save`,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      form: true,
      body: {
        _csrf: csrfToken,
        user_application: appId,
        ...defaultPrizeDraw,
        ...{
          'draw.id': prizeDraw.id || 'new',
          'draw.name': prizeDraw.name,
          'draw.gameType': prizeDraw.gameType
        }
      }
    }

    return cy.request(options).then(prizeResponse => {
      expect(prizeResponse.status).to.eq(200, `Prize created with id: ${prizeResponse.body.id}`)
    })
  })
}

export const createPrizeFromEmily = (prizeName: string, appId: string) => {
  const emilyLMSUrl = Cypress.env('LMS')

  return getCSRFTokenFromEmily().then(csrfToken => {
    const options = {
      method: 'POST',
      url: `${emilyLMSUrl}/prize/save`,
      form: true,
      body: {
        _csrf: csrfToken,
        user_application: appId,
        ...defaultNewPrize,
        'prize.name': prizeName
      }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.eq(200, `Prize ${prizeName} created with id: ${response.body.id}`)
    })
  })
}

export const addPrizeToDrawFromEmily = (
  prizeDrawId: string,
  prizeItemId: string,
  appId: string
) => {
  const emilyLMSUrl = Cypress.env('LMS')

  return getCSRFTokenFromEmily().then(csrfToken => {
    const options = {
      method: 'POST',
      url: `${emilyLMSUrl}/draw-prize/save`,
      form: true,
      body: {
        _csrf: csrfToken,
        user_application: appId,
        ...addDefaultNewPrizeToDraw,
        'draw_prize.drawId': prizeDrawId,
        'draw_prize.itemId': prizeItemId
      }
    }
    return cy.request(options)
  })
}

export const createCourseFromHippo = (
  token: string,
  title: string,
  visibleToLearners?: boolean,
  extraCoursePayload?: object
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const courseOptions = {
    method: 'POST',
    url: `${hippoUrl}/api/courses`,
    body: { ...defaultCourse, ...{ title }, ...extraCoursePayload },
    headers: { token }
  }

  return cy.request(courseOptions).then(courseResponse => {
    expect(courseResponse.status).to.equal(200, `Course: ${courseResponse.body.id} created`)
    if (courseResponse.status === 200 && visibleToLearners) {
      const coursePublishOptions = {
        method: 'POST',
        url: `${hippoUrl}/api/courses/${courseResponse.body.id}/publish`,
        body: {},
        headers: { token }
      }

      cy.request(coursePublishOptions).then(publishResponse => {
        expect(publishResponse.status).to.equal(200, `Course: ${courseResponse.body.id} published`)
        return courseResponse
      })
    }
  })
}

export const createLessonFromHippo = (
  token: string,
  courseId: string,
  title: string,
  visibleToLearners?: boolean,
  extraLessonPayload?: object
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const lessonOptions = {
    method: 'POST',
    url: `${hippoUrl}/api/lessons`,
    headers: { token },
    body: { title, courseId, ...extraLessonPayload }
  }

  return cy.request(lessonOptions).then(lessonResponse => {
    expect(lessonResponse.status).to.equal(
      200,
      `Lesson: ${lessonResponse.body.id} created for course: ${courseId}`
    )
    if (lessonResponse.status === 200 && visibleToLearners) {
      const lessonPublishOptions = {
        method: 'PATCH',
        url: `${hippoUrl}/api/lessons/${lessonResponse.body.id}/setVisibility`,
        body: { visibleToLearners },
        headers: { token }
      }

      cy.request(lessonPublishOptions).then(publishResponse => {
        expect(publishResponse.status).to.equal(200, `Lesson: ${lessonResponse.body.id} published`)
        return lessonResponse
      })
    }
  })
}

export const createDiscussionFromHippo = (
  token: string,
  courseId: string,
  title: string,
  isPublished?: boolean,
  extraDiscussionPayload?: object
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const description = title
  const discussionOptions = {
    method: 'POST',
    url: `${hippoUrl}/api/discussions`,
    headers: { token },
    body: { title, description, courseId }
  }

  return cy.request(discussionOptions).then(discussionResponse => {
    expect(discussionResponse.status).to.equal(
      200,
      `Discussion: ${discussionResponse.body.id} created for course: ${courseId}`
    )

    const discussionPublishOptions = {
      method: 'PATCH',
      url: `${hippoUrl}/api/discussions/${discussionResponse.body.id}`,
      body: { description, isPublished, ...extraDiscussionPayload },
      headers: { token }
    }

    cy.request(discussionPublishOptions).then(publishResponse => {
      expect(publishResponse.status).to.equal(
        200,
        `Discussion: ${discussionResponse.body.id} published`
      )
      return discussionResponse.body.id
    })
  })
}

export const createAssignmentFromHippo = (
  token: string,
  courseId: string,
  title: string,
  isPublished?: boolean,
  extraAssignmentPayload?: object
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const description = title
  const assignmentOptions = {
    method: 'POST',
    url: `${hippoUrl}/api/assessments`,
    headers: { token },
    body: { title, courseId }
  }

  return cy.request(assignmentOptions).then(assignmentResponse => {
    expect(assignmentResponse.status).to.equal(
      200,
      `Assignment: ${assignmentResponse.body.id} created for course: ${courseId}`
    )

    const assignmentPublishOptions = {
      method: 'PATCH',
      url: `${hippoUrl}/api/assessments/${assignmentResponse.body.id}`,
      body: { description, isPublished, ...extraAssignmentPayload },
      headers: { token }
    }

    cy.request(assignmentPublishOptions).then(publishResponse => {
      expect(publishResponse.status).to.equal(
        200,
        `Assignment: ${assignmentResponse.body.id} published`
      )
      return assignmentResponse.body.id
    })
  })
}

export interface SlideSubstitutionMap {
  //slideDataDoc: string
  type: string
  subtype: string
  templateName: string
  questions: string
  title: string
  buttonText: string
  noMediaUploaded: string
  prompt: string
  doneText: string
}

export const createSlideFromEmily = (
  lessonId: string,
  courseId: string,
  slideSubstitutionMap?: SlideSubstitutionMap
) => {
  const emilyLMSUrl = Cypress.env('LMS')

  return cy.getCookie('connect.sid').then(cookie => {
    const lessonOptions = {
      method: 'GET',
      url: `${emilyLMSUrl}/lesson/${lessonId}/get-config`,
      headers: { cookie: `connect.sid=${cookie.value}` }
    }
    cy.request(lessonOptions).then(getConfigResponse => {
      createASlideRequest['lesson._id'] = getConfigResponse.body._id
      createASlideRequest['lesson.course']._id = courseId
      const lessonConfig = JSON.parse(createASlideRequest['lesson.configuration'])
      const secondSlideId = lessonConfig.slides[1].id
      if (slideSubstitutionMap) {
        //lessonConfig.slides[1]._t = slideSubstitutionMap.slideDataDoc;
        lessonConfig.slides[1].type = slideSubstitutionMap.type
        lessonConfig.slides[1].data.title = slideSubstitutionMap.title
        lessonConfig.slides[1].data.buttonText = slideSubstitutionMap.buttonText
        lessonConfig.slides[1].data.noMediaUploaded = slideSubstitutionMap.noMediaUploaded
        lessonConfig.slides[1].data.prompt = slideSubstitutionMap.prompt
        lessonConfig.slides[1].data.doneText = slideSubstitutionMap.doneText
        lessonConfig.slides[1].templateName = slideSubstitutionMap.templateName
        lessonConfig.slides[1].subtype = slideSubstitutionMap.subtype
        lessonConfig.slides[1].metadata.questions = slideSubstitutionMap.questions
        createASlideRequest['lesson.configuration'] = JSON.stringify(lessonConfig)
        // maybe encode? to convert " to \" // it do not think is needed
      }

      const slideOptions = {
        method: 'POST',
        url: `${emilyLMSUrl}/lesson/save`,
        headers: { cookie: `connect.sid=${cookie.value}` },
        body: createASlideRequest
      }
      cy.request(slideOptions).then(slideResponse => {
        expect(slideResponse.status).to.equal(
          200,
          `Slide created for Course: ${courseId} and Lesson: ${lessonId}`
        )
        return { ...slideResponse, slideId: secondSlideId }
      })
    })
  })
}

export const upgradeAccountToEnterpriseFromHippo = (
  token: string,
  applicationId: string,
  planId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/billing/plan/enterprise`,
    body: { applicationId, planId },
    headers: { token }
  }
  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Upgraded to Enterprise account`)
  })
}

export const upgradePlanFromHippo = (token: string, plan: string) => {
  let planId

  switch (plan.toLowerCase()) {
    case 'growth':
      planId = '912a5eda-ba69-4ba2-bc67-32afdef196cb'
      break
    case 'plus':
      planId = '6d4e3ac7-6814-47e8-a221-c8038c92a545'
      break
    default:
      console.error('Please provide a plan name')
      break
  }

  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/billing/plan`,
    body: { planIds: [planId] },
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Plan Upgraded to ${plan}`)
  })
}

export const createFreemiumAccountFromHippo = (companyName: string, email: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/register/freemium`,
    body: { companyName, email }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Freemium account created with email: ${email}`)
  })
}

export const addDiscussionPostToLearnersAppFromHippo = (
  token: string,
  discussionId: string,
  content: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/discussions/${discussionId}/posts`,
    headers: { token },
    body: { content, media: [] }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Post added to Discussion: ${discussionId}`)
  })
}

export const createCourseCollectionFromHippo = (token: string, title: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/courseCollections`,
    headers: { token },
    body: { title }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Course Collection created: ${response.body}`)
  })
}

export const deleteCourseCollectionFromHippo = (
  token: string,
  collectionId: string,
  cascade? = true
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'DELETE',
    url: `${hippoUrl}/api/courseCollections/${collectionId}`,
    headers: { token },
    body: { cascade }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200)
  })
}

export const addCoursesToCollectionFromHippo = (
  token: string,
  courseCollectionId: string,
  courseId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/courses/${courseId}/courseCollections`,
    headers: { token },
    body: { courseCollectionId }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Course ${courseId} added to Collection: ${courseCollectionId}`
    )
  })
}

export const deleteCourseByIdFromHippo = (
  adminEmail: string,
  adminPassword: string,
  courseId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'DELETE',
      url: `${hippoUrl}/api/courses/${courseId}`,
      headers: { token }
    }

    return cy.request(options).then(deleteResponse => {
      expect(deleteResponse.status).to.equal(200, `Course ${courseId} DELETED`)
    })
  })
}

export const createPlaylistFromHippo = (
  adminEmail: string,
  adminPassword: string,
  title: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/playlists`,
      headers: { token },
      body: { ...defaultNewPlaylist, ...{ title } }
    }

    return cy.request(options).then(createPlaylistReponse => {
      expect(createPlaylistReponse.status).to.equal(
        200,
        `Playlist ${title} created with id: ${createPlaylistReponse.body}`
      )
      return createPlaylistReponse.body
    })
  })
}

export const addCoursesToPlaylistFromHippo = (
  adminEmail: string,
  adminPassword: string,
  playlistId: string,
  title: string,
  courses: string[]
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const courseOptions = {
      method: 'GET',
      url: `${hippoUrl}/api/playlists/${playlistId}/courses`,
      headers: { token }
    }

    return cy.request(courseOptions).then(playlistResponse => {
      playlistResponse.body.forEach((element: { id: string }) => {
        courses.push(element.id) // GET existing courses first, then append new course to the list
      })

      const playlistOptions = {
        method: 'PUT',
        url: `${hippoUrl}/api/playlists/${playlistId}`,
        headers: { token },
        body: { title, courses }
      }

      return cy.request(playlistOptions).then(addCoursesToPlaylistResponse => {
        expect(addCoursesToPlaylistResponse.status).to.equal(
          200,
          `Added courses ${courses} to playlist ${title}(${playlistId})`
        )
      })
    })
  })
}

const begin = new Date().toUTCString()
let counter = 5
const ENV = Cypress.env('NODE_ENV')
const mailgunDomain = Cypress.env(`${ENV}_MAILGUN_DOMAIN`)

export const getMagicLinkFromMailgun = (recipient: string, subject?: string) => {
  const options = {
    method: 'GET',
    url: `https://api.mailgun.net/v3/${mailgunDomain}/events`,
    auth: {
      user: 'api',
      pass: Cypress.env('MAILGUN_API_KEY')
    },
    qs: {
      subject,
      recipient,
      begin,
      to: recipient,
      event: 'delivered',
      from: `support@${mailgunDomain}`,
      ascending: 'yes'
    },
    form: true
  }

  cy.wait(15000) //https://documentation.mailgun.com/en/latest/api-events.html#event-polling

  return cy.request(options).then(mailgunResponse => {
    if (mailgunResponse.body.items.length > 0) {
      expect(mailgunResponse.status).to.equal(
        200,
        `Magic Link: ${mailgunResponse.body.items[0]['user-variables'].magicLink}`
      )
      return mailgunResponse.body.items[0]['user-variables'].magicLink
    } else {
      counter--
      if (counter) {
        //recursion: poll requests every 15 seconds until mailgun returns the magiclink
        //https://docs.cypress.io/api/commands/request.html#Request-Polling
        getMagicLinkFromMailgun(recipient, subject)
      }
    }
  })
}

export const getLmsFreePlanWelcomeEmailFromMailgun = (recipient: string, subject?: string) => {
  const options = {
    method: 'GET',
    url: `https://api.mailgun.net/v3/${mailgunDomain}/events`,
    auth: {
      user: 'api',
      pass: Cypress.env('MAILGUN_API_KEY')
    },
    qs: {
      subject,
      recipient,
      begin,
      to: recipient,
      event: 'delivered',
      from: `support@${mailgunDomain}`,
      ascending: 'yes'
    },
    form: true
  }

  cy.wait(15000) //https://documentation.mailgun.com/en/latest/api-events.html#event-polling

  return cy.request(options).then(mailgunResponse => {
    if (mailgunResponse.body.items.length > 0) {
      expect(mailgunResponse.status).to.equal(
        200,
        `Mailgun delivered ${subject} email to ${recipient}`
      )
      return mailgunResponse.body
    } else {
      counter--
      if (counter) {
        getLmsFreePlanWelcomeEmailFromMailgun(recipient, subject)
      }
    }
  })
}

export const getEmailFromMailgun = (recipient: string, subject?: string) => {
  const options = {
    method: 'GET',
    url: `https://api.mailgun.net/v3/${mailgunDomain}/events`,
    auth: {
      user: 'api',
      pass: Cypress.env('MAILGUN_API_KEY')
    },
    qs: {
      subject,
      begin,
      to: recipient,
      event: 'delivered',
      from: `support@${mailgunDomain}`,
      ascending: 'yes'
    },
    form: true
  }

  cy.wait(15000) //https://documentation.mailgun.com/en/latest/api-events.html#event-polling

  return cy.request(options).then(mailgunResponse => {
    if (mailgunResponse.body.items.length > 0) {
      expect(mailgunResponse.status).to.equal(200, `Email delivered to: ${recipient}`)
      return mailgunResponse.body.items[0]
    } else {
      //recursion: poll requests 5 times every 15 seconds until mailgun returns the email
      //https://docs.cypress.io/api/commands/request.html#Request-Polling
      counter--
      if (counter) {
        getEmailFromMailgun(recipient, subject)
      }
    }
  })
}

export const completeCourseFromHippo = (
  courseId: string,
  courseTitle: string,
  lessonId: string,
  lessonTitle: string,
  campusToken: string
) => {
  const attempt = uuidv4()
  const batch = [
    {
      ClientId: uuidv4(),
      endpoint: 'attempt',
      started_timestamp: Date.now(),
      attempt,
      ended_timestamp: Date.now(),
      score: 100,
      earned_stars: 0,
      needed_stars: 0,
      needed_score: 0,
      success: true,
      successful: true,
      lessonExternalIdentifier: null,
      max_stars: 0,
      entity: lessonId,
      courseId: courseId,
      type: 'attempt',
      timestamp: Date.now()
    },
    {
      ClientId: uuidv4(),
      endpoint: 'event',
      type: 'event',
      name: 'course-completed',
      value: courseTitle,
      id: courseId,
      lessonsCompleted: 1,
      timestamp: Date.now()
    },
    {
      ClientId: uuidv4(),
      endpoint: 'view',
      name: '1',
      id: uuidv4(),
      duration: 7538,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      course_id: courseId,
      already_completed: false,
      attempt,
      progress: 0,
      type: 'view',
      timestamp: Date.now()
    },
    {
      ClientId: uuidv4(),
      endpoint: 'view',
      name: '2',
      id: uuidv4(),
      duration: 967,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      course_id: courseId,
      already_completed: false,
      attempt,
      progress: 0,
      type: 'view',
      timestamp: Date.now()
    },
    {
      ClientId: uuidv4(),
      endpoint: 'event',
      name: 'lesson-completed',
      value: lessonTitle,
      id: lessonId,
      score: 100,
      type: 'event',
      timestamp: Date.now()
    }
  ]

  const options = {
    method: 'POST',
    url: `${Cypress.env('HIPPO')}/api/Interactions/batch`,
    body: batch,
    headers: { token: campusToken }
  }

  cy.request(options).then(response => {
    expect(response.status).to.equal(200, 'Course Completed via API')
  })
}

export const downloadCourseCompletionCertificate = (
  courseId: string,
  learnerId: string,
  filePath: string
) => {
  const certificateUrl = `${Cypress.env(
    'EMILY_API'
  )}/certificate/${courseId}/${learnerId}/certificate.pdf`

  const options = {
    method: 'GET',
    url: certificateUrl,
    gzip: false,
    encoding: 'base64',
    qs: 'locale=en'
  }

  cy.request(options).then(cert => {
    cy.writeFile(filePath, cert.body, 'base64')
  })
}

export const createDeputyAccount = (
  email: string,
  firstName: string,
  lastName: string,
  deputyOrganization: string
) => {
  let deputyCookie: string

  const signUpOptions = {
    method: 'POST',
    url: 'https://once.deputy.com/my/post-signup.php',
    body: {
      cmd: 'doSignUpOrLoginViaEmail',
      FirstName: firstName,
      LastName: lastName,
      EmailAddress: email,
      DPSignupPage: 'https://www.deputy.com/#signupModal',
      starter: false
    },
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    form: true
  }

  return cy.request(signUpOptions).then(response => {
    const redirectUrl = response.body.redirectUrl

    const cookie = response.headers['set-cookie'][0]

    const loginOptions = {
      method: 'GET',
      url: redirectUrl,
      headers: { cookie },
      followRedirect: false
    }

    return cy.request(loginOptions).then(response => {
      deputyCookie = response.allRequestResponses[0]['Response Headers']['set-cookie'][1]

      const installOptions = {
        method: 'POST',
        url: 'https://once.deputy.com/api/my/onboarding/install',
        headers: {
          authority: 'once.deputy.com',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          accept: '*/*',
          origin: 'https://once.deputy.com',
          cookie: deputyCookie
        },
        body: {
          GeoInfo: { city: 'Federal', CountryCode: 'AU', lat: '-28.6549', lon: '153.4587' },
          CompanyName: deputyOrganization,
          SetupMyOwnData: {
            CompanyName: deputyOrganization,
            GeoInfo: { city: 'Federal', CountryCode: 'AU', lat: '-28.6549', lon: '153.4587' },
            GooglePlaceBusinessType: '',
            Mobile: ''
          },
          HasCompanyName: true,
          EnterpriseBusiness: 0,
          GooglePlaceBusinessType: '',
          trialIntentionOptions: [3],
          Industry: 'Government',
          demoDataTemplate: 'other',
          SignupFlow: 3,
          Mobile: '',
          EstimatedEmployeeNumber: 5,
          DeputyExperiments: {}
        },
        form: true
      }

      return cy.request(installOptions).then(response => {
        const DPDomain = response.body.hostName

        const onboardingOptions = {
          method: 'POST',
          url: 'https://once.deputy.com/api/my/onboarding/sf',
          headers: { cookie: installOptions.deputyCookie },
          body: {
            DPDomain,
            Company_Info: { formatted_address: 'Federal', name: deputyOrganization },
            Contact_Phone: '',
            IsEnterprise: false,
            Extend_Trial_Covid: false,
            Deputy_Campaign_Code: '',
            Deputy_Experiments: {}
          }
        }

        return cy.request(onboardingOptions).then(response => {
          expect(response.status).to.equal(
            200,
            `Deputy account created with email: ${email} and organization: ${deputyOrganization}`
          )
          return deputyCookie
        })
      })
    })
  })
}

export const configureStarInfoForPreLessonScreen = (
  adminUser: string,
  adminPassword: string,
  lessonId: string,
  showStarProgressScore: boolean,
  hideScore: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  return getUserTokenFromHippo(adminUser, adminPassword).then(response => {
    const campusToken = response.body.token
    const getOptions = {
      method: 'GET',
      url: `${hippoUrl}/api/lessons/${lessonId}`,
      headers: { token: campusToken }
    }
    cy.request(getOptions).then(lessonResponse => {
      const putOptions = {
        method: 'PUT',
        url: `${hippoUrl}/api/lessons/${lessonId}`,
        headers: { token: campusToken },
        body: {
          title: lessonResponse.body.title,
          courseId: lessonResponse.body.courseId,
          showStarProgressScore: showStarProgressScore,
          hideScore: hideScore
        }
      }

      return cy.request(putOptions).then(response => {
        expect(response.status).to.equal(
          200,
          `Value of showStarProgressScore and hideStarInformation are ${showStarProgressScore} and ${hideScore}`
        )
      })
    })
  })
}

export const createLinkedAITranslatedCourse = (
  token: string,
  courseId: string,
  locale: string,
  linkTranslation: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/translate/cloud/${courseId}`,
    form: true,
    headers: { token },
    body: {
      locale: locale,
      linkTranslation: linkTranslation
    }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Translated course id is ${response.body.id} for original course id ${courseId}`
    )
  })
}

export const getDeeplinks = (
  adminUsername: string,
  learnerId: string,
  password: string
): Cypress.Chainable<Cypress.TypedResponse<DeeplinkResponseType>> => {
  return getUserTokenFromHippo(adminUsername, password).then(tokenResponse => {
    return getPublicApiTokenFromHippo(tokenResponse.body.token).then(tokenResponse => {
      const apiToken = tokenResponse.body
      const restUrl = Cypress.env('PUBLIC_API')

      const options = {
        method: 'GET',
        url: `${restUrl}/v1/users/${learnerId}/courses`,
        headers: { Authorization: `Bearer ${apiToken}` }
      }

      return cy.request(options)
    })
  })
}

export const getDeeplinkCourse = (
  deeplinks: DeeplinkResponseType,
  courseTitle: string
): DeepLinksResponse => {
  return deeplinks.find(deeplinkCourse => {
    return deeplinkCourse.title === courseTitle
  })
}

export const getDeeplinkLesson = (
  deeplinksCourse: DeepLinksResponse,
  lessonTitle: string
): DeepLinksLesson => {
  return deeplinksCourse.lessons.find(deeplinkLesson => {
    return deeplinkLesson.title === lessonTitle
  })
}

export const enableLeaderboardForCourse = (
  adminUser: string,
  adminPassword: string,
  courseId: string
): Cypress.Chainable<Cypress.TypedResponse<void>> => {
  const hippoUrl = Cypress.env('HIPPO')
  return getUserTokenFromHippo(adminUser, adminPassword).then(response => {
    const token = response.body.token
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/v2/leaderBoard/enable`,
      body: { courseId, isEnabled: true },
      headers: { token }
    }
    return cy.request(options).then(response => {
      expect(response.status).to.equal(200, courseId)
    })
  })
}

export const mockFeatureFlags = (flags: { key: string; value: boolean }[]): void => {
  const flagString = flags.reduce((prev, curr, index) => {
    return prev + `key[${index}]=${curr.key}`
  }, '')
  cy.intercept('GET', `/api/feature-flags?${flagString}`, {
    statusCode: 200,
    body: flags
  }).as('featureFlags')
}

export const mockAllFeatureFlags = (mockFlags: { key: string; value: boolean }[]): void => {
  cy.intercept('GET', '/api/feature-flags?', req => {
    req.reply(res => {
      const flags = res.body.map((flag: { key: string; value: boolean }) => {
        const flagToBeReplaced = mockFlags.find(mock => mock.key === flag.key)
        if (flagToBeReplaced) {
          return { ...flag, value: flagToBeReplaced.value }
        }
        return flag
      })

      res.send(200, flags)
    })
  }).as('allFeatureFlags')
}

export const addDefaultVideoToPeerSlide = (
  token: string,
  lessonId: string,
  slideId: string,
  videoURL: string,
  videoTitle: string,
  videoDescription: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/peerAuthoring/${lessonId}/${slideId}/media`,
    headers: { token },
    body: {
      url: videoURL,
      title: videoTitle,
      description: videoDescription
    }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Video was added to slide ${slideId} for lesson ${lessonId}`
    )
  })
}

export const deleteDefaultVideoFromPeerSlide = (
  token: string,
  lessonId: string,
  slideId: string,
  mediaId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'DELETE',
    url: `${hippoUrl}/api/peerAuthoring/${lessonId}/${slideId}/media/${mediaId}`,
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Video ${mediaId} was deleted from slide ${slideId} and lesson ${lessonId}`
    )
  })
}

export const addCommentToVideoForPeerSlide = (
  token: string,
  lessonId: string,
  slideId: string,
  mediaId: string,
  commentText: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/peerAuthoring/${lessonId}/${slideId}/media/${mediaId}/comments`,
    headers: { token },
    body: {
      comment: commentText
    }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Comment was added to video ${mediaId} of slide ${slideId}`
    )
  })
}

export const deleteCommentFromVideoForPeerSlide = (
  token: string,
  lessonId: string,
  slideId: string,
  mediaId: string,
  commentId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'DELETE',
    url: `${hippoUrl}/api/peerAuthoring/${lessonId}/${slideId}/media/${mediaId}/comments/${commentId}`,
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(
      200,
      `Comment ${commentId} was deleted from video ${mediaId} of slide ${slideId}`
    )
  })
}

export const updateLessonFromHippo = (
  token: string,
  courseId: string,
  lessonId: string,
  lessonTitle: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'PUT',
    url: `${hippoUrl}/api/lessons/${lessonId}`,
    headers: { token },
    body: { courseId, title: lessonTitle }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `lesson ${lessonId} was updated`)
  })
}

export const registerAccountHasPreviewedInTheApp = (adminEmail: string, adminPassword: string) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/onboarding/checklist/main/PreviewOnApp/complete`,
      headers: { token }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.equal(204, `Preview on the app checklist is completed`)
    })
  })
}

export const getCertificate = (
  adminEmail: string,
  adminPassword: string,
  courseId: string,
  userId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'GET',
      url: `${hippoUrl}/api/user-course-certificates/${courseId}/${userId}/details`,
      headers: { token },
      failOnStatusCode: false,
      retryOnStatusCodeFailure: false,
      skipRequestOverride: true
    }

    const getUserCourseCertificates = () => {
      // Wait before each attempt since it takes time to form the certificate
      cy.wait(10000)
      return cy.request(options).then(certificateResponse => {
        if (certificateResponse.status != 200) {
          //recursion: poll requests 5 times every 10 seconds until it returns the certificate
          counter--
          if (counter) {
            getUserCourseCertificates()
          }
        }
      })
    }

    getUserCourseCertificates()
  })
}

export const inviteUsers = (
  adminEmail: string,
  adminPassword: string,
  learnerEmail: string,
  isAdmin: boolean,
  isLearner: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/users/invite-manual`,
      headers: { token },
      body: {
        emailSubject: "You've been invited to join EdApp",
        sendEmail: true,
        users: [
          {
            email: learnerEmail,
            isAdmin: isAdmin,
            isLearner: isLearner
          }
        ]
      }
    }
    return cy.request(options).then(response => {
      expect(response.status).to.equal(200, `User was invited`)
      return { ...response, token }
    })
  })
}

export const createTemplate = (
  adminEmail: string,
  adminPassword: string,
  templateTitle: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/certificates`,
      headers: { token },
      body: { templateTitle: templateTitle }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.equal(200, `Template was created`)
      return { response }
    })
  })
}

export const getBanner = (adminEmail: string, adminPassword: string, titleValue?: string) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'GET',
      url: `${hippoUrl}/api/banners/sync`,
      headers: { token },
      failOnStatusCode: false,
      retryOnStatusCodeFailure: false,
      skipRequestOverride: true
    }

    const getBannerUpdate = () => {
      // Wait before each attempt since it takes time to form the certificate
      cy.wait(1000)
      return cy.request(options).then(bannerResponse => {
        if (titleValue) {
          // if title value exists then check titleValue
          if (bannerResponse.body.length == 0 || bannerResponse.body[0].title != titleValue) {
            counter--
            if (counter) {
              getBannerUpdate()
            }
          }
        } else {
          // if title value does not exist then check body length is empty so we can exit
          if (bannerResponse.body.length == 0) {
            return
          }

          counter--
          if (counter) {
            getBannerUpdate()
          }
        }
      })
    }

    getBannerUpdate()
  })
}

export const getAllBanners = (adminEmail: string, adminPassword: string) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'GET',
      url: `${hippoUrl}/api/banners`,
      headers: { token }
    }

    cy.request(options).then(response => {})
  })
}

export const toggleGroupTrainingForCourse = (
  adminEmail: string,
  adminPassword: string,
  courseId: string,
  isGroupTrainingEnabled: boolean
) => {
  const hippoUrl = Cypress.env('HIPPO')
  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    const token = tokenResponse.body.token
    const options = {
      method: 'PATCH',
      url: `${hippoUrl}/api/courses/${courseId}`,
      headers: { token },
      body: { isGroupTrainingEnabled }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.equal(
        200,
        `group training for course ${courseId} was ${
          isGroupTrainingEnabled ? 'enabled' : 'disabled'
        }`
      )
    })
  })
}
export const registerLearnerToGTCourse = (
  learnerEmail: string,
  learnerPassword: string,
  sessionId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return loginToLearnersApp(learnerEmail, learnerPassword).then(loginResponse => {
    const token = loginResponse.campus_token
    const appUserId = loginResponse._id
    const options = {
      method: 'POST',
      url: `${hippoUrl}/api/group-training/sessions/${sessionId}/attendees`,
      headers: { token },
      body: { appUserId }
    }

    return cy.request(options).then(response => {
      expect(response.status).to.equal(200, `learner is registered for session ${sessionId}`)
    })
  })
}

export const completeCoursesForUsersFromHippo = (
  token: string,
  userIds: string,
  courseIds: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/ed-admin/complete-courses-for-users`,
    body: {
      userIds: [userIds],
      courseIds: [courseIds]
    },
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(204, `Course was completed`)
  })
}

export const completeLessonsForUsersFromHippo = (
  token: string,
  userIds: string,
  lessonIds: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/api/ed-admin/complete-lessons-for-users`,
    body: {
      userIds: [userIds],
      lessonIds: [lessonIds]
    },
    headers: { token }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(204, `Lesson was completed`)
  })
}

export const createUserGroupPublicApiFromHippo = (
  publicApiToken: string,
  userGroupName: string
) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'POST',
    url: `${hippoUrl}/v2/usergroups`,
    body: {
      name: userGroupName,
      inviteCode: `${userGroupName} ${Date.now()}`
    },
    headers: { Authorization: `Bearer ${publicApiToken}` }
  }

  return cy.request(options).then(response => {
    expect(response.status).to.equal(200, `Public user group created: ${userGroupName}`)
  })
}

export const getCertificatesTemplates = (token: string) => {
  const hippoUrl = Cypress.env('HIPPO')
  const options = {
    method: 'GET',
    url: `${hippoUrl}/api/certificates`,
    headers: { token }
  }

  return cy.request(options).then(res => {
    return res.body
  })
}

export const deleteCertificatesTemplates = (templateId: string, token: string) => {
  const hippoUrl = Cypress.env('HIPPO')

  const options = {
    method: 'DELETE',
    url: `${hippoUrl}/api/certificates/${templateId}`,
    headers: { token }
  }

  return cy.request(options)
}

export const addUserToUserGroupPublicApiFromHippo = (
  adminEmail: string,
  adminPassword: string,
  userGroupId: string,
  userId: string
) => {
  const hippoUrl = Cypress.env('HIPPO')

  return getUserTokenFromHippo(adminEmail, adminPassword).then(tokenResponse => {
    return getPublicApiTokenFromHippo(tokenResponse.body.token).then(tokenResponse => {
      const apiToken = tokenResponse.body
      const options = {
        method: 'POST',
        url: `${hippoUrl}/v2/usergroups/${userGroupId}/users`,
        headers: { Authorization: `Bearer ${apiToken}` },
        body: { userId: userId }
      }

      return cy.request(options).then(response => {
        expect(response.status).to.equal(
          201,
          `User ${userId} was added to the User Group ${userGroupId}`
        )
      })
    })
  })
}
