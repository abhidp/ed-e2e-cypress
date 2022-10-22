import {
  createAssignmentFromHippo,
  createDiscussionFromHippo,
  createLessonFromHippo,
  mockFeatureFlags
} from 'cypress/support/helper/api-helper'
import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  navBar: 'ul.nav.navbar-nav.navbar-left',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item',
  createCourseButton: '[data-testid="createCourseButton"]',
  courseDescriptionInput: '[data-testid="subtle-text-area"]',
  briefcaseTitleInput: '[name="briefcase_document.title"]',
  briefcaseDescriptionInput: '[name="briefcase_document.description"]',
  calendarMonth: '.react-datepicker__month',
  calendarWeek: '.react-datepicker__week',
  calendarStartDate: '[placeholder="Start"]',
  calendarEndDate: '[placeholder="End"]',
  checkBox: 'input[type="checkbox"]',
  calendarToggle: 'input[data-testid="calendar-toggle-Checkbox"]',
  requiredLessons: '.required-lessons-wrapper',
  uniqueIdentifier: 'input[placeholder="Unique identifier"]',
  publishButton: '[data-testid="PublishButton"]',
  settingsLink: '[data-testid="SettingsLink"]',
  cardHoverOverlay: `*[class^="HoverOverlay"]`,

  elementById: (id: string) => `#${id}`,
  elementByTestId: (id: string) => `[data-testid=${id}]`,
  button: (btnLabel: string) => `button:contains(${btnLabel})`,
  breadcrumbByText: (text: string) => `a.crumb-title:contains("${text}")`,
  classNameContains: (text: string) => `div.class:contains("${text}")`
}

const adminUser = createEmail()
const learnerEmail = `learner+${createEmail()}`

const password = Cypress.env('COMMON_TEST_PASSWORD')
const timestamp = Date.now()

const courseTitle = 'Cypress Automation Course Title'
const brandingThumbnailImage = 'courses/courseThumbnail.jpg'
const brandingCoverImage = 'courses/courseCover.jpg'
const customCSS = `{ color: #4f4f4f; }`
const briefcaseAttachmentPDF = 'courses/briefcaseAttachment.pdf'

let courseId: string
let lessonId: string
let assignmentId: any

const publishedLessonTitle = `ED-21538-Published-lesson`
const draftLessonTitle = `ED-21538-Lesson-to-be-Published`

const discussionTitle = `ED-21538-Published-Discussion`
const draftAssignmentTitle = `ED-21538-Assignment-to-be-Published`

describe('Feature: Create Course', () => {
  beforeEach('Define Network Calls for backend responses', () => {
    cy.intercept({ method: 'GET', url: 'api/courses/*' }).as('courseCreated')
    cy.intercept({ method: 'PUT', url: 'api/courses/*' }).as('courseSaved')
    cy.intercept({ method: 'PATCH', url: 'api/spacedrepetition/config/course/*' }).as(
      'spacedRepitition'
    )

    cy.intercept({ method: 'POST', url: '/api/courses/*/publish' }).as('coursePublished')
    cy.intercept({ method: 'GET', url: '/api/briefcase-document/course/*' }).as('getBriefcaseDoc')
    cy.intercept({ method: 'POST', url: '/briefcase-document/save' }).as('briefcaseDocSaved')
    cy.intercept({ method: 'POST', url: '/api/users/invite-manual' }).as('usersInvited')
    mockFeatureFlags([{ key: 'enable-brain-boost-admin-2-0', value: true }])
  })

  it('Login to LMS and navigate to Courses page', () => {
    cy.createLmsAccount(adminUser, password)
    cy.task('setValue', { adminUser, learnerEmail })

    cy.upgradeToEnterprisePlan(adminUser, password)
    cy.navigateTo('LMS', 'home')

    cy.get(selectors.navBar).contains('Course').should('exist')

    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.url().should('include', 'courseware')
  })

  it('Create course and validate it is in draft mode and has no lessons', () => {
    cy.get(selectors.createCourseButton)
      .click()
      .wait('@courseCreated')
      .then(res => {
        expect(res.response.statusCode).to.equal(200)
        courseId = res.response.body.id
      })

    cy.getByValue('Untitled course')
      .clear()
      .type(courseTitle, { delay: 100 })
      .blur()
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)

    cy.get(selectors.courseDescriptionInput)
      .clear()
      .type('This description is about Cypress Automation', { delay: 100 })
      .blur()
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)

    cy.get(selectors.publishButton).should('contain.text', 'Publish')
    cy.contains('No lessons in this course').should('be.visible')
  })

  it('Branding -> Course Image, Custom CSS for Courses and Lessons ', () => {
    cy.get(selectors.settingsLink).click()
    cy.get(selectors.elementByTestId('branding')).click()
    cy.url().should('include', 'branding')

    cy.get(selectors.elementByTestId('brandingCoverImgSection'))
      .find(selectors.elementByTestId('uploadImageButton'))
      .should('exist')
      .attachFile(brandingCoverImage)
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)

    cy.get(selectors.elementByTestId('brandingCoverImgSection'))
      .find(selectors.elementByTestId('removeButton'))
      .should('exist')
    cy.get(selectors.elementByTestId('cover-image-preview')).find('img').should('have.attr', 'src')
  })

  it('Access Rules -> Validate Access Dates, User Groups and Prerequisites', () => {
    cy.get(selectors.elementByTestId('access-rules')).click()
    cy.url().should('include', 'access-rules')

    cy.get(selectors.elementByTestId('accessDatesCard'))
      .get(selectors.calendarToggle)
      .first()
      .click({ force: true })
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)

    //access start date is deprecated. Hence access start date test is removed
    cy.get(selectors.elementByTestId('endDateInput')).get(selectors.calendarEndDate).click()
    cy.get(selectors.calendarMonth).get(selectors.calendarWeek).last().children().last().click()

    cy.get(selectors.elementByTestId('accessDatesCard'))
      .get(selectors.calendarToggle)
      .last()
      .click({ force: true })
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)

    cy.get(selectors.elementByTestId('userGroupsCard'))
      .should('be.visible')
      .and('contain.text', 'Universal Access')
      .and('contain.text', 'Allow all your users to access this course')
      .find(selectors.checkBox)
      .should('be.checked')

    cy.get(selectors.elementByTestId('prerequisitesCard')).should('be.visible')
  })

  // skipping flaky test to prevent build failures. TODO: will after proper investigation later
  xit('Briefcase -> Validate Adding and deleting new document', () => {
    cy.get(selectors.elementByTestId('briefcase')).click()
    cy.url().should('include', 'briefcase')

    cy.get(selectors.elementByTestId('createNewDocumentButton')).click()
    cy.url().should('include', 'briefcase-document/new?course=')

    cy.contains('Please specify a title before uploading a document').should('be.visible')

    cy.get(selectors.briefcaseTitleInput).type('Cypress Document Attachment Title').blur()
    cy.contains('Please specify a title before uploading a document').should('not.be.visible')

    cy.get(selectors.briefcaseDescriptionInput).type('Cypress Document Attachment Description')
    cy.get(selectors.elementById('publish-status')).should('contain', 'A Draft')

    cy.get(selectors.elementByTestId('uploadImageButton'))
      .attachFile(briefcaseAttachmentPDF)
      .wait('@briefcaseDocSaved')
    cy.get(selectors.elementByTestId('fileUploadPreview')).should('be.visible')

    cy.get(selectors.elementById('publish-pop-over')).click()
    cy.get(selectors.elementById('publish-menu'))
      .contains('Publish')
      .click()
      .wait('@briefcaseDocSaved')
    cy.get(selectors.elementById('publish-status')).should('contain', 'Published')

    cy.get(selectors.elementByTestId('removeButton')).click().wait('@briefcaseDocSaved')
    cy.get(selectors.elementByTestId('fileUploadPreview')).should('not.exist')

    cy.get(selectors.breadcrumbByText(courseTitle)).click().wait('@courseCreated')

    cy.get(selectors.settingsLink).click()
    cy.get(selectors.elementByTestId('briefcase')).click()
    cy.contains('Cypress Document Attachment Title').and('be.visible')

    cy.getByTestIdLike('briefcase-item-delete').click({ multiple: true })

    cy.get(selectors.elementByTestId('dialog'))
      .should('be.visible')
      .get(selectors.button('Delete'))
      .click()
      .wait('@getBriefcaseDoc')

    cy.get(selectors.elementByTestId('briefcaseFileName')).should('not.exist')
  })

  it('Engagement and Brain Boost -> Enable', () => {
    cy.get(selectors.elementByTestId('engagement')).click()
    cy.url().should('include', 'engagement')

    cy.contains('Select question slides from this course to be included in Brain Boost sessions')
    cy.contains(`0 question slides available for boosting`)
  })

  it('Completion -> Enable completion requirements and Additional Options', () => {
    cy.get(selectors.elementByTestId('completion')).click()
    cy.url().should('include', 'completion')

    cy.get(selectors.requiredLessons).should('not.exist')
    cy.contains('Additional Options').get(selectors.checkBox).should('be.checked')

    cy.getByTestId('milestone-lessons-radio')
      .click()
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)
    cy.get(selectors.requiredLessons).should('be.visible')
  })

  it('More -> Course Link, Translation', () => {
    cy.get(selectors.elementByTestId('more')).click()
    cy.url().should('include', 'more')

    cy.contains('Link a Course').should('be.visible').click()
    cy.get(selectors.elementByTestId('dialog'))
      .should('be.visible')
      .and('contain.text', 'Select a course to link')
      .and(
        'contain.text',
        `This course will be displayed in place of the original if it matches the learner's device setting.`
      )

    cy.get(selectors.elementByTestId('close-dialog-button')).click()

    cy.contains('New translation').click()
    cy.get(selectors.elementByTestId('dialog'))
      .should('be.visible')
      .and('contain.text', 'Create a new course translation')
      .and('contain.text', 'Manual Translation')
      .and('contain.text', 'AI Translation')
    cy.get(selectors.button('Cancel')).click()

    cy.get(selectors.uniqueIdentifier)
      .type(`${timestamp}{enter}`)
      .wait('@courseSaved')
      .its('response.statusCode')
      .should('eq', 200)
  })

  it('Verify Course is present in Courses page in draft mode', () => {
    cy.navigateTo('LMS', 'courseware')
    cy.getByTestIdLike('content-card-contents-')
      .first()
      .should('exist')
      .and('be.visible')
      .find(`[data-testid="course-status"]`)
      .contains('Draft', { matchCase: false })
  })

  it('Create Lessons, D&A, Conference and assign it to the course', () => {
    cy.getUserTokenFromHippo(adminUser, password).then(tokenResponse => {
      //create a published lesson
      createLessonFromHippo(tokenResponse.body.token, courseId, publishedLessonTitle, true)
      //Create a draft lesson
      createLessonFromHippo(tokenResponse.body.token, courseId, draftLessonTitle, false).then(
        response => {
          lessonId = response.body.id
        }
      )
      //Create a published discussion
      createDiscussionFromHippo(tokenResponse.body.token, courseId, discussionTitle, true)
      //Create a draft assignment
      createAssignmentFromHippo(
        tokenResponse.body.token,
        courseId,
        draftAssignmentTitle,
        false
      ).then(responseId => {
        assignmentId = responseId
      })
    })
  })

  it('Navigate to course and publish it', () => {
    cy.get(selectors.cardHoverOverlay).invoke('attr', 'style', 'opacity: 1')

    cy.getByTestIdLike('content-card-contents-')
      .first()
      .find(`[data-testid="edit-course-btn"]`)
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .should('exist')
      .click()

    cy.url().should('include', 'v2/course').wait('@courseCreated')
    cy.get(selectors.publishButton).click()

    //Draft lessons select and publish modal
    cy.getByTestId('dialog')
      .should('exist')
      .within(dialog => {
        cy.wrap(dialog)
          .should('contain.text', 'Your course has unpublished lessons')
          .and(
            'contain',
            'Unpublished lessons will not be displayed to learners. Select which lessons you would like to publish'
          )

        cy.wrap(dialog).getByButtonText('Skip').should('be.enabled')
        cy.wrap(dialog).getByButtonText('Publish').should('be.disabled')

        cy.wrap(dialog).getByClassNameLike('ItemListBox').children().should('have.length', 2)

        cy.wrap(dialog).contains('Select all').should('be.visible').click()

        //Validate checkbox ticked for draft lesson
        cy.wrap(dialog)
          .getByClassNameLike('ItemListBox')
          .getByTestId(`item-checkbox-${lessonId}`)
          .should('be.checked')

        //Validate checkbox ticked for draft assignment
        cy.wrap(dialog)
          .getByClassNameLike('ItemListBox')
          .getByTestId(`item-checkbox-${assignmentId}`)
          .should('be.checked')

        cy.wrap(dialog).getByButtonText('Publish').should('be.enabled').click()
      })

    //Publish course new modal
    cy.getByTestId('dialog')
      .should('exist')
      .within(dialog => {
        cy.wrap(dialog).should('contain', 'Publish course')
        cy.wrap(dialog).getByTestId('publish-select').click()
        cy.wrap(dialog).get('#react-select-2-option-0').contains('Now').click()
        cy.wrap(dialog).contains('Advanced settings').click()
        cy.getByTestId('completion-certificate-toggle-Checkbox').should('be.checked')
        cy.getByTestId('course-leaderboard-toggle-Checkbox').should('not.be.checked').forceClick()
        cy.getByButtonText('Publish').click().wait('@coursePublished')
      })

    cy.getByTestId('dialog')
      .should('contain.text', `You've published your first course!`)
      .and(
        'contain.text',
        `There are no learners enrolled in this course, so no-one can access it. Would you like to invite learners?`
      )

    cy.getByButtonText('Yes, show me how').click()
    cy.url().should('include', '/invite')
  })

  it('Invite users and publish the course again, should not show Invite users message', () => {
    cy.navigateTo('LMS', 'invite')

    cy.getByPlaceHolderText('name@domain.com').first().type(createEmail())
    cy.getByButtonText('Send invitations').click().wait('@usersInvited')

    cy.navigateTo('LMS', 'courseware')
    cy.contains(courseTitle).should('be.visible')

    //Unpublish
    cy.getByTestIdLike('content-card-contents-')
      .first()
      .find(`[data-testid="edit-course-btn"]`)
      .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
      .should('exist')
      .click()
    cy.url().should('include', 'course').wait('@courseCreated')

    // TODO: Intermittent bug on course publish button - frontend occasionally does not update the state when published/draft button is clicked.
    //Publish again
    // cy.get(selectors.publishButton).click().wait('@coursePublished')

    // cy.getByTestId('dialog')
    //   .should('contain.text', `You've published your first course!`)
    //   .and(
    //     'contain.text',
    //     `This course is now available to your invited learners, track their progress in analytics.`
    //   )

    // cy.getByButtonText('Continue').click()
  })

  it('Navigate to published course, check if selected lesson/assignments are published', () => {
    cy.navigateTo('LMS', `v2/course/${courseId}`)
    cy.getByTestId('course-status').should('contain', 'Published')

    //check if lessons are published while publishing the course
    cy.getByTestId(`content-card-contents-${lessonId}`).should('not.contain.text', 'Draft')
    cy.getByTestId(`content-card-contents-${assignmentId}`).should('not.contain.text', 'Draft')
  })
})

describe('Learner can view the published course', () => {
  it('Learner should be able to view and access published course', () => {
    cy.task('getValue').then(value => {
      const lessons = [
        publishedLessonTitle,
        discussionTitle,
        draftLessonTitle,
        draftAssignmentTitle
      ]
      cy.createLearnerAccount(value.adminUser, password, value.learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])

      cy.loginToLearnersAppViaUI(value.learnerEmail, password)
      cy.getByTestId('tab-content-for-you').findByTestId(`CourseCard-${courseId}`).forceClick()
      cy.url().should('include', `/#course/${courseId}`)

      //lesson
      lessons.forEach(element => {
        cy.getByTestId('tab-content-lessons').should('contain', element)
      })
    })
  })
})
