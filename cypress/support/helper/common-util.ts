import { mockAllFeatureFlags } from 'cypress/support/helper/api-helper'
import { generateName } from './utils'
const dateNow = `${Date.now()}`

export const getByTestId = (dataTestId: string) => cy.get(`[data-testid="${dataTestId}"]`)

export const getByTestIdLike = (dataTestId: string) => cy.get(`[data-testid*="${dataTestId}"]`)

export const getByButtonText = (buttonText: string) => cy.get(`button:contains("${buttonText}")`)

export const getByPlaceHolderText = (placeHolderText: string) =>
  cy.get(`[placeholder="${placeHolderText}"]`)

export const getByValue = (value: string) => cy.get(`[value="${value}"]`)

export const getByName = (name: string) => cy.get(`[name="${name}"]`)

export const getByType = (type: string) => cy.get(`[type="${type}"]`)

export const getByClassNameLike = (classNameLike: string) => cy.get(`[class*="${classNameLike}"]`)

export const findByTestId = (subject: Cypress.Chainable<HTMLElement>, dataTestId: string) =>
  cy.wrap(subject).find(`[data-testid="${dataTestId}"]`)

export const forceClick = (element: string) => cy.wrap(element).click({ force: true })

export const clearAndType = (subject: string, text: string) =>
  cy.wrap(subject).clear().type(text).tab()

/**
 * A util for selecting a tables rows
 * @param tableSelector Selector for the table for which so select it's rows
 */
export const getTableRows = (tableSelector: string) =>
  cy.get(tableSelector).find('tbody').children<HTMLTableSectionElement>()

export const waitForDialogWindow = () => {
  cy.getByTestId('dialog').should('be.visible')
  cy.getByTestId('close-dialog-button').should('be.visible')
  cy.getByButtonText('Cancel').should('be.visible')
}

export const navigateTo = (
  app: 'LMS' | 'LEARNERS_APP' | 'HIPPO' | 'WEBSITE',
  uri?: string,
  resetSession?: boolean
) => {
  const appUrl = Cypress.env(app)
  // This line allows you to pass uri starting with slash or not ('/home' or 'home')
  const cleanUri = uri ? (uri.indexOf('/') === 0 ? uri.slice(1) : uri) : ''
  const onBeforeLoad = resetSession ? window => window.localStorage.clear() : undefined

  if (app === 'LEARNERS_APP') {
    mockAllFeatureFlags([{ key: 'lx-new-rego', value: true }])
  }

  return cy
    .visit(`${appUrl}/${cleanUri}`, {
      onBeforeLoad,
      headers: { 'E2E-TESTS': 'true' }
    })
    .url()
}

export const createName = () => {
  return generateName()
}

export const createEmail = (domain?: string) => {
  switch (Cypress.env('NODE_ENV')) {
    case 'PROD':
      domain = domain || '@edapp.com'
      return `edappt+${createName().replace(/\s+/g, '+')}+${dateNow}${domain}`.toLowerCase()

    default:
      domain === undefined ? (domain = '@gmail.com') : (domain = domain)
      return `edappt+${createName().replace(/\s+/g, '+')}+${dateNow}${domain}`.toLowerCase()
  }
}

export const createInviteCode = (prefix = 'edappt') => {
  return `${prefix}+${dateNow}`
}

export const waitForRequest = (
  method: 'GET' | 'POST' | 'PUT',
  route: string,
  action: () => void
) => {
  cy.server()
  cy.route(method, route).as(route)
  action()
  cy.wait(`@${route}`)
}

export const waitForMultipleRequests = (
  requests: Array<{ route: string; method: string }>,
  action: () => void
) => {
  cy.server()
  for (const req of requests) {
    cy.route(req.method, req.route).as(req.route)
  }
  action()
  for (const req of requests) {
    cy.wait(`@${req.route}`)
  }
}

export const logOutLMS = () => {
  return cy.request({
    method: 'GET',
    url: `${Cypress.env('LMS')}/logout`
  })
}

export const logOutLearner = () => {
  cy.navigateTo('LEARNERS_APP', '#profile')
  cy.getByButtonText('Sign out').forceClick()
  cy.getByButtonText('Yes, I’m sure').forceClick()
  cy.url().should('include', '#login')
}

declare global {
  interface IDBFactory {
    databases: () => Promise<Array<{ name: string }>>
  }
}

export const clearAllIndexDB = () => {
  const openRequests: IDBOpenDBRequest[] = []
  let countRequests = 0

  return new Promise<void>((resolve, reject) => {
    window.indexedDB.databases().then(dbNames => {
      dbNames.forEach(db => {
        openRequests.push(window.indexedDB.deleteDatabase(db.name))
        countRequests++
      })
    })

    if (openRequests.length === 0) {
      resolve()
      return
    }

    openRequests.forEach(req => {
      req.onerror = ev => {
        reject(ev)
      }

      req.onsuccess = ev => {
        countRequests--
        if (countRequests === 0) {
          resolve(ev)
        }
      }
    })
  })
}

export const iframe = $iframe => {
  Cypress.log({
    name: 'iframe',
    consoleProps() {
      return {
        iframe: $iframe
      }
    }
  })

  return new Cypress.Promise(resolve => {
    onIframeReady(
      $iframe,
      () => {
        resolve($iframe.contents().find('body'))
      },
      () => {
        $iframe.on('load', () => {
          resolve($iframe.contents().find('body'))
        })
      }
    )
  })
}

function onIframeReady($iframe, successFn, errorFn) {
  try {
    const iCon = $iframe.first()[0].contentWindow,
      bl = 'about:blank',
      compl = 'complete'
    const callCallback = () => {
      try {
        const $con = $iframe.contents()
        if ($con.length === 0) {
          // https://git.io/vV8yU
          throw new Error('iframe inaccessible')
        }
        successFn($con)
      } catch (e) {
        // accessing contents failed
        errorFn()
      }
    }

    const observeOnload = () => {
      $iframe.on('load.jqueryMark', () => {
        try {
          const src = $iframe.attr('src').trim(),
            href = iCon.location.href
          if (href !== bl || src === bl || src === '') {
            $iframe.off('load.jqueryMark')
            callCallback()
          }
        } catch (e) {
          errorFn()
        }
      })
    }
    if (iCon.document.readyState === compl) {
      const src = $iframe.attr('src').trim(),
        href = iCon.location.href
      if (href === bl && src !== bl && src !== '') {
        observeOnload()
      } else {
        callCallback()
      }
    } else {
      observeOnload()
    }
  } catch (e) {
    // accessing contentWindow failed
    errorFn()
  }
}

export const learnersHomePageRequests = [
  { method: 'GET', route: '/api/users/sync' },
  { method: 'GET', route: '/api/course-collections/*' },
  // "Free Trial" doesn't allow Lottery
  // { method: 'GET', route: '/api/game' },
  // { method: 'GET', route: '/api/stars' },
  { method: 'GET', route: '/api/courseprogress/*' }
  // { method: 'POST', route: '/api/stars/check-daily-reward' }
]

export const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const timeDiffInHours = (currentTime: number, pastTime: number) => 
  Math.abs((currentTime - pastTime) / (60 * 60 * 1000)) //milliseconds in 1 hour
