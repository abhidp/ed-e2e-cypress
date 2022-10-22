export type LessonConfigType = {
  logo?: string
  background?: string
  enableCustomCSS?: boolean
  customCSS?: string
  language?: string
  direction?: string
  hasScormExitButton?: boolean
  preventLogoutOnExit?: boolean
  minimumScore?: number
  disableLessonScore?: boolean
  disableInteractionSummary?: boolean
  hasAnswerFeedback?: boolean
  colors?: {
    text: string
    background: string
  }
  pageNumbers?: boolean
  pagination?: boolean
  indicator?: boolean
  upload?: {
    request: {
      endpoint: string
      accessKey: string
    }
    signature: {
      endpoint: string
    }
    uploadSuccess: {
      endpoint: string
    }
    retry: {
      enableAuto: boolean
    }
  }
}

export type SlideType = {
  id?: string
  type: string
  subtype: string
  data: any
  metadata?: any
  strippedMetadata?: any
  display?: string
  permanent?: boolean
  templateName?: string
  displayIndex?: string | number
  name?: string | number
  templateDescription?: string
  isLastSlide?: boolean
}

export type LessonItemType = {
  id: string
  moduleId?: string | null
  description: string
  title: string
  isPublished: boolean
  previewUri: string
  slides: SlideType[]
  config: LessonConfigType
  useCourseBranding: boolean
  customCSS: string
  enableCustomCSS: boolean
}
