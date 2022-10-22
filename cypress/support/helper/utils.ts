import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(advancedFormat)

const { _ } = Cypress
const nameArray = require('cypress/fixtures/util/name.json')
// To use with form data
const isNullOrUndefined = (value: any) => value === undefined || value === null

const isObject = (prop: any) => _.isObject(prop) && !_.isArray(prop)

export const getNestedFormData = (params: {}, prefix: string = ''): string => {
  return Object.keys(params)
    .filter(key => !isNullOrUndefined(params[key]))
    .map(key => {
      const prop = params[key]
      const newPrefix = prefix ? `${prefix}.${key}` : `${key}`
      if (isObject(prop)) {
        return getNestedFormData(prop, newPrefix)
      }
      if (Array.isArray(prop)) {
        if (prop.length === 0) {
          return ''
        }
        const arrayPrefix = `${newPrefix}[]`
        return prop
          .map((v: any) => {
            return isObject(v)
              ? getNestedFormData(v, arrayPrefix)
              : `${arrayPrefix}=${encodeURIComponent(v)}`
          })
          .join('&')
      }
      return `${newPrefix}=${encodeURIComponent(prop)}`
    })
    .filter(v => !!v)
    .join('&')
}

export const capitalizeFirstCharacter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const getNameFromEmail = (email: string) => {
  return {
    firstName: capitalizeFirstCharacter(email.split('edappt+').pop().split('+')[0]),
    lastName: capitalizeFirstCharacter(email.split('edappt+').pop().split('+')[1])
  }
}

export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min
}

export function flattenObject<T extends Record<string, any>>(
  object: T,
  path: string | null = null,
  separator = '.'
): T {
  return Object.keys(object).reduce((accumulator, key) => {
    const value: object | Date | RegExp = object[key]
    let newPath = Array.isArray(object)
      ? `${path ? path : ''}[${key}]`
      : [path, key].filter(Boolean).join(separator)

    const isObject = [
      typeof value === 'object',
      value !== null,
      !(value instanceof Date),
      !(value instanceof RegExp),
      !(Array.isArray(value) && value.length === 0)
    ].every(Boolean)

    if (isObject) {
      return { ...accumulator, ...flattenObject(value, newPath, separator) }
    } else {
      if (newPath.includes(']')) {
        const parent = newPath.substring(0, newPath.lastIndexOf(']') + 1)
        const child = newPath
          .substring(newPath.length, newPath.lastIndexOf(']') + 1)
          .split('.')
          .join('][')
          .concat(']')
          .substring(1)

        newPath = parent + child
      }
      return { ...accumulator, [newPath]: value }
    }
  }, {} as T)
}

export const reverseArray = (array: string[]) => [...array].reverse()

export const generateName = () => {
  const adjectives: string[] = nameArray.adjectives
  const noun: string[] = nameArray.nouns

  var name =
    capitalizeFirstCharacter(adjectives[getRandomInt(0, adjectives.length)]) +
    ' ' +
    capitalizeFirstCharacter(noun[getRandomInt(0, noun.length)])
  return name
}

export const getThomasIframe = (iframeId?: string) => {
  return cy.get(`iframe#${iframeId ? iframeId : 'lesson-iframe'}`).iframe()
}

export const selectDateFromDatePicker = (
  datePicker: Cypress.Chainable<Element>,
  date: dayjs.Dayjs
) => {
  const dateLabel = `Choose ${date.format('dddd, MMMM Do, YYYY')}`
  return datePicker.filter(`[aria-label="${dateLabel}"]`).forceClick()
}
