const { _ } = Cypress
import { CourseType } from './course-types'
import { flattenObject } from './utils'
import {
  PrizingAppSettingsType,
  AddNewPrizeType,
  PrizeDrawType,
  NewPrizeType,
  CreatePlaylistType
} from './types'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

export const defaultCourse: CourseType = {
  id: '',
  modified: undefined,
  created: undefined,
  thumbnail: '',
  title: '',
  description: '',
  brandingImage: '',
  brandingTextColor: 'black',
  externalIdentifier: '',
  hasNextLessonButton: false,
  planning: {},
  timeSpent: undefined,
  totalNumberOfUsers: undefined,
  usageInformation: undefined,
  universalAccess: false,
  userGroups: [],
  metaTags: {},
  collectionId: '',
  collectionTitle: '',
  collectionRank: 0,
  collectionIsManual: false,
  prerequisites: [],
  lessons: [],
  thomasUrl: '',
  isTutorial: false,
  config: {
    colors: {
      background: '#46B4E9',
      text: 'black',
      theme: ''
    },
    hasScormExitButton: false,
    preventLogoutOnExit: false,
    disableInteractionSummary: false,
    hasAnswerFeedback: false,
    pagination: true,
    language: '',
    direction: '',
    disableLessonScore: false,
    minimumScore: 0,
    indicator: true,
    pageNumbers: true,
    logo: '',
    background: '',
    enableCustomCSS: false,
    customCSS: ''
  },
  internationalisation: {
    locale: 'en'
  },
  display: {
    active: false
  },
  completionCriteria: {
    openToComplete: false,
    percentage: 100,
    lessons: [],
    milestone: 'percentage',
    certificate: {
      enabled: false
    }
  },
  dueBy: {},
  modules: []
}

export const defaultPrizingAppSettings: PrizingAppSettingsType = {
  enableStars: 'on',
  appOpenRewardAmount: 10,
  enableStarBar: 'on',
  starBar: '57c53311259c7a5c005923ac', // Spin To Win
  enableCompliance: 'on',
  complianceText: 'This is a placeholder compliance text'
}

function getDefaultPrizes() {
  const draw_prize: AddNewPrizeType = {
    draw_prize: {
      id: '',
      drawId: '',
      itemId: '',
      quantity: '',
      prizes: [] as any
    }
  }

  _.times(50).forEach(i => {
    draw_prize.draw_prize['prizes'].push({
      code: { value: `AB${i + 1}`, alreadySaved: false },
      value: { value: i + 10, alreadySaved: false }
    })
  })

  return flattenObject(draw_prize)
}

export const addDefaultNewPrizeToDraw = getDefaultPrizes()

export const defaultPrizeDraw: PrizeDrawType = flattenObject({
  draw: {
    name: '',
    gameType: 'chance',
    minWinningProbability: 1,
    configuration: { winningProbability: 1 },
    maxWinningProbability: 1,
    minIntervalDaysBetweenWinForSameUser: 0,
    start: dayjs().utcOffset(0).subtract(5, 'minutes').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'),
    end: dayjs().utcOffset(0).add(10, 'minutes').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]')
  }
})

export const defaultNewPrize: NewPrizeType = flattenObject({
  prize: {
    id: 'new',
    type: 'custom',
    name: '',
    description: `Prize ${dayjs().unix()}`,
    imageUrl: '',
    fields: [
      { name: 'code', type: 'code' },
      { name: 'value', type: '$ value' }
    ],
    email: {
      from: 'admin@ourcompany.com',
      subject: 'You Won 1 Million Dollars!!',
      message: 'Congratulations on winning! Here are your prize details:code: ##CODE## ##VALUE##'
    }
  }
})

export const defaultNewPlaylist: CreatePlaylistType = {
  completionImage: '',
  completionText: 'Congratulations! You have completed this playlist.',
  courses: [],
  coverImage: '',
  coverImageTextColor: 'white',
  description: '',
  id: '',
  isPublished: false,
  title: '',
  universalAccessEnabled: true,
  userGroups: []
}

export const ACCOUNT_COOKIE_NAME = 'account-to-be-imported-from'

export const defaultCustomAchievement = {
  achievers: [],
  badgeBorderColor: '#0E1C2B',
  badgeMediaUrl:
    'https://media.edapp.com/image/upload/v1625091460/custom-achievements/Images/target.png',
  colorScheme: 'dark',
  completion: 'Congratulations, you have earned this achievement',
  description: 'Open EdApp 1 time(s)',
  title: undefined,
  isPublished: true,
  status: undefined,
  translations: [],
  recipes: [
    {
      action: 'open',
      value: 1,
      measure: 'none',
      counter: 1,
      feature: 'edapp',
      featureId: null,
      period: 1,
      repeat: 'once'
    }
  ]
}
