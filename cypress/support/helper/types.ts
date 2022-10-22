export type PrizeDrawType = {
  draw: {
    name: string
    gameType: string
    minWinningProbability: number
    configuration: { winningProbability: number }
    maxWinningProbability: number
    minIntervalDaysBetweenWinForSameUser: number
    start?: string
    end?: string
  }
}

export type AddNewPrizeType = {
  draw_prize: {
    id: string
    drawId: string
    itemId: string
    quantity: string
    prizes: Array<{
      code: {
        value: string
        alreadySaved: boolean
      }
      value: {
        value: number
        alreadySaved: boolean
      }
    }>
  }
}

export type NewPrizeType = {
  prize: {
    id: string
    type: string
    name: string
    description: string
    imageUrl: string
    fields: Array<{
      name: string
      type: string
    }>
    email: {
      from: string
      subject: string
      message: string
    }
  }
}

export type UserProfileType = {
  userId: string
  userEmail: string
  userFirstName: string
  userLastName: string[]
  userCustomFields: string[]
  userIsAdministrator: true
  userApplicationId: string
}

export type UserGroupResponse = {
  _id: string
  name: string
  app: string
  userGroupContains: 'groups' | 'users'
  registrationSettings: {}
  lottery: {
    enabled: boolean
    enableSpinToWin: boolean
  }
  isDynamicGroup: boolean
  isBulkCreated: false
  isAccountGroup: false
  groups: string[]
  freezeUsers: boolean
  courses: string[]
  catalogsCanAccess: string[]
}

export type PrizingAppSettingsType = {
  enableStars: string
  appOpenRewardAmount: number
  enableStarBar: string
  starBar: string
  enableCompliance: string
  complianceText: string
}

export type CreatePlaylistType = {
  completionImage: string
  completionText: string
  courses: string[]
  coverImage: string
  coverImageTextColor: string
  description: string
  id: string
  isPublished: false
  title: string
  universalAccessEnabled: true
  userGroups: string[]
}

export type AchievementTranslationResponse = {
  locale: {
    code: string
    name: string
  }
  values: {
    completion: string
    description: string
    title: string
  }
}

export type Recipe = {
  action: string
  value: number
  measure: string
  counter: number
  feature: string
  featureId: string | null
  featureIdTitle?: string
  period: number
  repeat: string
  isInvalid?: boolean
}

export type Achiever = {
  name: string
  userGroups: string[]
  earnedDate: string // Datetime and Timezone
}

export type Language = {
  name: string
  code: string
}

export type Achievement = {
  colorScheme: 'light' | 'dark'
  badgeMediaUrl: string
  badgeBorderColor: string
  isPublished: boolean
  achievers?: Achiever[]
  recipes: (Recipe | Partial<Recipe>)[]
  title: string
  completion: string
  description: string
  id?: string
  defaultLocale: Language | null
  translations: AchievementTranslationResponse[] | null
  status: 'drafted' | 'published' | 'archived'
  isInvalid: boolean
  isLocked: boolean
}

type DeepLinksBaseType = {
  unlocked: boolean
  completed: boolean
  opened: boolean
  unlockedDate: string
  completedDate: string
  openedDate: string
  id: string
  title: string
  launchURI: string
}
export type DeepLinksLesson = DeepLinksBaseType

export type DeepLinksResponse = DeepLinksBaseType & {
  thumbnail: string
  lessons: DeepLinksLesson[]
  externalIdentifier: string
}

export type DeeplinkResponseType = DeepLinksResponse[]
