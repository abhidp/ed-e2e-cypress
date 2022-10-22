import { LessonItemType } from './lesson-types'

export type Colors = {
  background: string
  text: string
  experimental?: boolean
  theme?: string
}

export type StyleConfigurationType = {
  background: string
  colors?: Colors
  enableCustomCSS: boolean
  customCSS: string
  direction: string
  disableInteractionSummary: boolean
  disableLessonScore: boolean
  hasAnswerFeedback: boolean
  hasScormExitButton: boolean
  preventLogoutOnExit: boolean
  indicator: boolean
  logo: string
  minimumScore: number
  pageNumbers: boolean
  pagination: boolean
  language: string
}

export type CoursePlanningType = {
  startDateTime?: string
  endDateTime?: string
}

export type CourseCompletionCriteriaType = {
  certificate: {
    enabled: boolean
  }
  lessons: string[]
  milestone: string
  openToComplete: boolean
  percentage: number
}

export type DueByType = {
  date?: Date
  daysSinceUnlocked?: number
}

export type CourseInternationalisationType = {
  locale: string
}

export type ModuleItemType = {
  id: string | null
  courseId: string
  title: string
  isDraggable?: boolean
}

export type CourseType = {
  id: string
  modified?: Date
  created?: Date

  title: string
  description: string
  brandingTextColor: 'white' | 'black'
  externalIdentifier: string
  hasNextLessonButton: boolean
  brandingImage: string
  thumbnail: string
  isTutorial: boolean
  config: StyleConfigurationType
  planning: CoursePlanningType
  completionCriteria: CourseCompletionCriteriaType
  dueBy: DueByType
  prerequisites: string[]
  display: {
    active: boolean
  }
  metaTags: {}
  internationalisation: CourseInternationalisationType
  universalAccess: boolean
  userGroups: string[]
  lessons: LessonItemType[]
  thomasUrl: string
  collectionId: string
  collectionTitle: string
  collectionRank: number
  collectionIsManual: boolean
  totalNumberOfUsers?: number
  timeSpent?: number
  usageInformation?: {
    importedTimes: number
    estimatedDurationInSeconds: number
  }

  modules: ModuleItemType[]
}
