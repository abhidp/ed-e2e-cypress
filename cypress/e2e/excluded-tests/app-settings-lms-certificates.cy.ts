import { createEmail } from 'cypress/support/helper/common-util'
import { completeCourseFromHippo, getCertificate } from 'cypress/support/helper/api-helper'

const courseTitleA = 'A'
const courseTitleZ = 'Z'
const courseTitleMathSymbols1 = 'Course+1'
const courseTitleMathSymbols2 = 'Course+2'
const lessonTitle = 'ED-20911: Lesson'
const firstNameA = 'Aa'
const lastNameA = 'lastName'
const firstNameZ = 'Zz'
const lastNameZ = 'lastName'
const extraCoursePayload = {
  completionCriteria: {
    openToComplete: false,
    percentage: 100,
    lessons: [],
    milestone: 'percentage',
    certificate: {
      enabled: true
    }
  }
}

const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  courseCertificatesTable: `[data-testid="course-certificates-table"]`
}

describe('Feature: Certificates 📃 ', () => {
  describe('As Learner complete courses', () => {
    it('Should create an LMS account, learners and courses', () => {
      // create admin -> upgrade to Enterprise
      const adminEmail = createEmail()
      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      // create learners where set first name
      const learnerEmailA = `a+${adminEmail}`
      const learnerEmailZ = `z+${adminEmail}`

      cy.createLearnerAccount(
        adminEmail,
        password,
        learnerEmailA,
        password,
        ['app-user'],
        firstNameA,
        lastNameA
      ).then(learner => {
        cy.task('setValue', { learnerIdA: learner.body.id })
      })

      cy.createLearnerAccount(
        adminEmail,
        password,
        learnerEmailZ,
        password,
        ['app-user'],
        firstNameZ,
        lastNameZ
      ).then(learner => {
        cy.task('setValue', { learnerIdZ: learner.body.id })
      })

      cy.task('setValue', { adminEmail, learnerEmailA, learnerEmailZ })

      // create 4 courses
      cy.createCourseAndLesson(
        adminEmail,
        password,
        courseTitleA,
        lessonTitle,
        true,
        true,
        {},
        extraCoursePayload
      ).then(res => {
        cy.task('setValue', { courseId: res.courseId, lessonId: res.lessonId })
      })
      cy.createCourse(adminEmail, password, courseTitleZ, true)
      cy.createCourse(adminEmail, password, courseTitleMathSymbols1, true)
      cy.createCourse(adminEmail, password, courseTitleMathSymbols2, true)
    })

    it('As a Learner A, Complete Course', () => {
      cy.intercept('GET', '/api/users/sync').as('sync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmailA, password)
        cy.wait('@sync').then(res => {
          completeCourseFromHippo(
            value.courseId,
            courseTitleA,
            value.lessonId,
            lessonTitle,
            res.response.body.campusToken
          )
        })

        // confirm certificate was generated via api GET user-course-certificate/.../details
        getCertificate(value.adminEmail, password, value.courseId, value.learnerIdA).then(() => {
          cy.logOutLearner()
        })
      })
    })

    it('As a Learner Z, Complete Course', () => {
      cy.intercept('GET', '/api/users/sync').as('sync')

      cy.task('getValue').then(value => {
        cy.loginToLearnersAppViaUI(value.learnerEmailZ, password)
        cy.wait('@sync').then(res => {
          completeCourseFromHippo(
            value.courseId,
            courseTitleA,
            value.lessonId,
            lessonTitle,
            res.response.body.campusToken
          )
        })

        // confirm certificate was generated via api GET user-course-certificate/.../details
        getCertificate(value.adminEmail, password, value.courseId, value.learnerIdZ).then(() => {
          cy.logOutLearner()
        })
      })
    })

    it('Should go to app settings and Search for Course Certificates', () => {
      cy.intercept('GET', 'api/certificates/*').as('readCourseCertificates')
      cy.navigateTo('LMS', '/app-settings#panel-certificates-awarded').wait(
        '@readCourseCertificates'
      )

      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 4)

      // search for non-existent Course
      cy.getByTestId('search-input-input').type('@!#$%&').wait('@readCourseCertificates')
      cy.contains('No results')
      cy.contains(`Try adjusting your search terms and filters to find what you're looking for.`)

      // clear all search and filters
      cy.contains('Clear all search and filters').click()
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 4)

      // search for Course A
      cy.getByTestId('search-input-input').type(courseTitleA).wait('@readCourseCertificates')
      cy.contains(courseTitleA)
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 1)

      // clear search input
      cy.getByTestId('search-input-clear').click()
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 4)

      // search for Course with Math Symbols
      cy.getByTestId('search-input-input')
        .type(courseTitleMathSymbols1)
        .wait('@readCourseCertificates')
      cy.contains(courseTitleMathSymbols1)
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 1)
      cy.getByTestId('search-input-clear').click()
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 4)

      // search for Course with partial match
      cy.getByTestId('search-input-input')
        .type(courseTitleMathSymbols1.substring(0, 7))
        .wait('@readCourseCertificates')
      cy.getTableRows(selectors.courseCertificatesTable).should('have.lengthOf', 2)
    })

    it('Should go to app settings and Search for users` course certificates', () => {
      cy.intercept('GET', 'api/certificates/*').as('readCourseCertificates')
      cy.intercept('GET', 'api/user-course-certificates/*').as('readUserCourseCertificates')

      // search for course
      cy.navigateTo('LMS', '/app-settings#panel-certificates-awarded')
      cy.getByTestId('search-input-input').type(courseTitleA).wait('@readCourseCertificates')
      cy.getTableRows(selectors.courseCertificatesTable)
        .contains(courseTitleA)
        .click()
        .wait('@readUserCourseCertificates')

      // search for non-existent user
      cy.getByTestId('search-input-input').type('@!#$%&').wait('@readUserCourseCertificates')
      cy.contains('No results')
      cy.contains(`Try adjusting your search terms and filters to find what you're looking for.`)

      // clear all search and filters
      cy.contains('Clear all search and filters').click()
      cy.get('tbody tr').should('have.lengthOf', 2)

      // search for user A
      cy.getByTestId('search-input-input').type(firstNameA).wait('@readUserCourseCertificates')
      cy.contains(firstNameA + ' ' + lastNameA)
      cy.get('tbody tr').should('have.lengthOf', 1)

      // clear search input
      cy.getByTestId('search-input-clear').click()
      cy.get('tbody tr').should('have.lengthOf', 2)

      // search for user with partial match
      cy.getByTestId('search-input-input').type(lastNameA).wait('@readUserCourseCertificates')
      cy.get('tbody tr').should('have.lengthOf', 2)
    })

    it('Should go to app settings and Sort for users` course certificates', () => {
      cy.intercept('GET', 'api/certificates/*').as('readCourseCertificates')
      cy.intercept('GET', 'api/user-course-certificates/*').as('readUserCourseCertificates')

      // search for course
      cy.navigateTo('LMS', '/app-settings#panel-certificates-awarded')
      cy.getByTestId('search-input-input').type(courseTitleA).wait('@readCourseCertificates')
      cy.getTableRows(selectors.courseCertificatesTable)
        .contains(courseTitleA)
        .click()
        .wait('@readUserCourseCertificates')

      // sort user desc
      cy.get('tr th').contains('User').click().wait('@readUserCourseCertificates')
      cy.get('tbody tr').first().contains(`${firstNameZ} ${lastNameZ}`)

      // sort user asc
      cy.get('tr th').contains('User').click()
      cy.get('tbody tr').first().contains(`${firstNameA} ${lastNameA}`)

      // sort awarded dec (most recent certs awarded)
      cy.get('tr th').contains('Awarded').click().wait('@readUserCourseCertificates')
      cy.get('tbody tr').first().contains(`${firstNameZ} ${lastNameZ}`)
    })

    it('Should go to Course and Download awarded certificates', () => {
      cy.intercept('GET', 'api/user-course-certificates/*').as('readUserCourseCertificates')

      cy.task('getValue').then(value => {
        // open a course
        cy.navigateTo(
          'LMS',
          `/app-settings?courseId=${value.courseId}#panel-certificates-awarded`
        ).wait('@readUserCourseCertificates')
      })

      // select All checkbox
      cy.getByTestId('checkbox-visible').first().click()

      cy.get('th').find('[class*=DownloadIcon]').should('be.visible')
      cy.get('h5').first().should('contain.text', `2 selected`)

      // Click on "Download" icon
      cy.get('th').find('[class*=DownloadIcon]').click()

      const zipFile = Cypress.config('downloadsFolder') + '/certificates.zip'

      // wait for the file to be fully downloaded by reading it (as binary)
      // and checking its length
      cy.readFile(zipFile, 'binary', { timeout: 15000 }).should('exist').and('have.length.gt', 300)
    })
  })
})
