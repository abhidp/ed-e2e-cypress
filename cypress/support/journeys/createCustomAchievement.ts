import {
  createAchievementFromHippo,
  updateAchievementFromHippo,
  getCustomAchievementFromHippo,
  getAchievementListFromHippo,
  deleteAchievementFromHippo
} from '../helper/api-helper'
import { Achievement } from '../helper/types'

export const createCustomAchievement = (
  email: string,
  password: string,
  title: string,
  status: string,
  isPublished: boolean
) => {
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    return createAchievementFromHippo(tokenResponse.body.token, title, status, isPublished).then(
      achievementResponse => {
        return `${achievementResponse.id}`
      }
    )
  })
}

export const updateCustomAchievement = (
  email: string,
  password: string,
  id: string,
  status: string,
  isPublished: boolean
) => {
  let token: string
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    token = tokenResponse.body.token
    return getCustomAchievementFromHippo(token, id).then(response => {
      const newBody = {
        ...response,
        status,
        isPublished
      }
      return updateAchievementFromHippo(token, newBody).then(achievementResponse => {
        return `${achievementResponse.id}`
      })
    })
  })
}

export const earnAchievementOnLearnersApp = (email: string, password: string, title: string) => {
  const selectors = {
    dialog: '[data-testid="dialog"]',
    closeButton: '[data-testid="icon-button"]',
    customAchievementPreview: '[data-testid="custom-achievement-preview"]'
  }
  cy.intercept({ method: 'GET', url: 'api/custom-achievements/sync' }).as('achievementsListFetched')
  cy.loginToLearnersAppViaUI(email, password)
  cy.navigateTo('LEARNERS_APP', '#home').wait('@achievementsListFetched')
  cy.get(selectors.dialog).should('be.visible')
  cy.get(selectors.dialog).within(() => {
    cy.contains(title.toUpperCase()).should('be.visible')
    cy.get(selectors.customAchievementPreview).should('be.visible')
    cy.get(selectors.closeButton).click({ multiple: true })
  })
}

export const bulkDeleteAllCustomAchievement = (email: string, password: string) => {
  let token: string
  return cy.getUserTokenFromHippo(email, password).then(tokenResponse => {
    token = tokenResponse.body.token
    return getAchievementListFromHippo(token).then(achievementList => {
      const idList = achievementList.map((achievement: Achievement) => achievement.id)
      return deleteAchievementFromHippo(token, idList).then((response: number) => {
        return `${response}`
      })
    })
  })
}
