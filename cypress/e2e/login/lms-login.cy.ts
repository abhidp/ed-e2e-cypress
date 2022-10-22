import { createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  pageLoadText: 'h1:contains("Welcome to EdApp")',
  email: '[name="nameOrEmail"]',
  password: '[name="password"]',
  signIn: '#btn-login',
  navDropdown: (email: string) => `div.navbar-account-user:contains("${email}")`,
  signOut: '[data-testid="logout"]',
  message: (message: string) => `.modal:contains("${message}")`,
  courseCardContainer: '[data-testid*="content-card-contents"]',
  navBar: 'ul.nav.navbar-nav.navbar-left',
  ['Browse course library']: 'button:contains("Browse course library")',
  headingEditorInput: '[data-testid="HeadingEditorTitleInput"]',
  coursewareLesson: '[data-testid*="content-card-contents"]',
  coursewareCard: '[data-testid*="content-card-contents"]',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item',
  lessonSettings: 'a:contains("Lesson settings")'
}

let adminUser: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const userTypeMap = {
  ['Learner']: { roles: ['app-user'], email: `edappt+learner+${createEmail()}` },
  ['Reviewer']: { roles: ['reviewer'], email: `edappt+reviewer+${createEmail()}` },
  ['Content Author']: { roles: ['content-author'], email: `edappt+content+${createEmail()}` },
  ['Admin']: { roles: ['account-admin'], email: `edappt+admin+${createEmail()}` },
  ['Account Owner']: { roles: ['account-owner'], email: `edappt+account+owner+${createEmail()}` }
}

describe('Feature: Login to LMS', () => {
  beforeEach(() => {
    cy.intercept('POST', '/login').as('login')
  })

  describe('Scenario: Create accounts', () => {
    before('Preserve Token', () => {
      cy.logOutLMS()
      Cypress.Cookies.preserveOnce('connect.sid')
    })

    it('Setup Trial, Learner, Reviewer, Content Author, Admin, Super Admin accounts', () => {
      adminUser = `edappt+admin+${createEmail()}`
      cy.navigateTo('LMS') // To avoid page reload
      cy.createLmsAccount(adminUser, password)

      Object.keys(userTypeMap).forEach(function (user: string) {
        const userInfo = userTypeMap[user]
        cy.createLearnerAccount(adminUser, password, userInfo.email, password, userInfo.roles)
      })
    })

    it('Add Course to Course List', () => {
      cy.createCourseLessonAndSlide(
        adminUser,
        password,
        'Cypress E2E Auto Course',
        'Cypress E2E Auto Lesson'
      )
    })
  })

  describe('Scenario: Login to LMS as LEARNER', () => {
    before('Preserve Token', () => {
      cy.logOutLMS()
      Cypress.Cookies.preserveOnce('connect.sid')
    })

    it('Enter Learner credentials and Sign in', () => {
      cy.navigateTo('LMS')

      cy.get(selectors.pageLoadText).should('be.visible')
      cy.get(selectors.email).type(userTypeMap['Learner'].email)
      cy.get(selectors.password).type(password)

      cy.get(selectors.signIn).click().wait('@login')
    })

    it(`Should show message: "This account doesn't have the required permissions..."`, () => {
      cy.get(
        selectors.message(
          "This account doesn't have the required permissions, please check with your account owner to ensure you have admin access"
        )
      )
        .should('exist')
        .and('be.visible')
    })
  })

  describe('Scenario: Login to LMS as REVIEWER', () => {
    before('Preserve Token', () => {
      Cypress.Cookies.preserveOnce('connect.sid')
      cy.logOutLMS()
    })

    it('Enter Reviewer credentials and Sign in', () => {
      cy.navigateTo('LMS')

      cy.get(selectors.pageLoadText).should('be.visible')
      cy.get(selectors.email).type(userTypeMap['Reviewer'].email)
      cy.get(selectors.password).type(password)

      cy.get(selectors.signIn).click().wait('@login')
    })

    it('Should redirect to /home page and have access to 1 Menu item and Course Menu', () => {
      cy.url().should('include', '/home')
      cy.get(selectors.navBar).children().its('length').should('eq', 1) //Facilitate menu is removed for Reviewers
      cy.get(selectors.navBar).contains('Course').should('exist')
    })

    it('Should NOT be able to edit a Course or Lesson', () => {
      cy.get(selectors.coursewareMenuItem).click()
      cy.get(selectors.coursesMenuItem).click()

      cy.get(selectors['Browse course library']).should('not.exist')

      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Edit')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()

      cy.url().should('include', '/v2/course')

      cy.get(selectors.headingEditorInput).should('be.disabled')
      //course settings link should not exist
      cy.getByTestId('SettingsLink').should('not.exist')

      cy.get(selectors.coursewareLesson)
        .first()
        .click({ force: true })
        .get(selectors.headingEditorInput)
        .should('be.disabled')
      //Lesson settings link should not exist
      cy.get(selectors.lessonSettings).should('not.exist')
    })
  })

  describe('Scenario: Login to LMS as CONTENT AUTHOR', () => {
    before('Preserve Token', () => {
      Cypress.Cookies.preserveOnce('connect.sid')
      cy.logOutLMS()
    })

    it('Enter Content Author credentials and Sign in', () => {
      cy.navigateTo('LMS')

      cy.get(selectors.pageLoadText).should('be.visible')
      cy.get(selectors.email).type(userTypeMap['Content Author'].email)
      cy.get(selectors.password).type(password)

      cy.get(selectors.signIn).click().wait('@login')
    })

    it('Should redirect to /home page and have access to 3 Menu items and Course Menu', () => {
      cy.url().should('include', '/home')
      cy.get(selectors.navBar).children().its('length').should('eq', 3)

      cy.get(selectors.coursewareMenuItem).click()
      cy.get(selectors.coursesMenuItem).click()

      cy.get(selectors['Browse course library']).should('exist')

      cy.get(selectors.navBar).contains('Courses').should('exist')
      cy.get(selectors.navBar).contains('Analytics').should('exist')
    })

    it('Should be able to edit a Course or Lesson', () => {
      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Edit')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()

      cy.url().should('include', '/v2/course')

      cy.get(selectors.headingEditorInput).should('not.be.disabled')

      cy.get(selectors.coursewareLesson)
        .first()
        .click({ force: true })
        .get(selectors.headingEditorInput)
        .should('not.be.disabled')
    })
  })

  describe('Scenario: Login to LMS as ADMIN', () => {
    before('Preserve Token', () => {
      Cypress.Cookies.preserveOnce('connect.sid')
      cy.logOutLMS()
    })

    it('Enter Admin credentials and Sign in', () => {
      cy.navigateTo('LMS')

      cy.get(selectors.pageLoadText).should('be.visible')
      cy.get(selectors.email).type(userTypeMap['Admin'].email)
      cy.get(selectors.password).type(password)

      cy.get(selectors.signIn).click().wait('@login')
    })

    it('Should redirect to /courses page and have to all courses and 5 menu items', () => {
      cy.navigateTo('LMS')

      cy.get(selectors.navBar).contains('Course').should('exist')
      cy.get(selectors.coursewareMenuItem).click()
      cy.get(selectors.coursesMenuItem).click()

      cy.url().should('include', '/courseware')
      cy.get(selectors.navBar).children().its('length').should('eq', 5)

      cy.get(selectors.coursewareMenuItem).click()
      cy.get(selectors.coursesMenuItem).click()

      cy.get(selectors['Browse course library']).should('exist')

      cy.get(selectors.navBar).contains('Courses').should('exist')
      cy.get(selectors.navBar).contains('Users').should('exist')
      cy.get(selectors.navBar).contains('Engage').should('exist')
      cy.get(selectors.navBar).contains('Analytics').should('exist')
    })

    it('Should be able to edit a Course but NOT Lesson', () => {
      cy.getByTestIdLike('content-card-contents')
        .first()
        .getByButtonText('Edit')
        .invoke('attr', 'style', 'pointer-events: auto; visibility: visible;')
        .click()

      cy.url().should('include', '/v2/course')

      cy.get(selectors.headingEditorInput).should('not.be.disabled')

      cy.get(selectors.coursewareLesson)
        .first()
        .click({ force: true })
        .get(selectors.headingEditorInput)
        .should('be.disabled')
    })
  })

  describe('Scenario: Login to LMS as ENTERPRISE', () => {
    before('Preserve Token', () => {
      Cypress.Cookies.preserveOnce('connect.sid')
      cy.logOutLMS()
    })

    it('Upgrade the account to Enterprise and enter Account Owner credentials', () => {
      cy.upgradeToEnterprisePlan(userTypeMap['Admin'].email, password)
      cy.navigateTo('LMS')

      cy.get(selectors.pageLoadText).should('be.visible')
      cy.get(selectors.email).type(userTypeMap['Admin'].email)
      cy.get(selectors.password).type(password)
    })

    it('Sign In should redirect to /courses page', () => {
      cy.get(selectors.signIn).click().wait('@login')
      cy.url().should('include', '/home')
    })
  })
})
