/* eslint-disable cypress/no-unnecessary-waiting */
/*
  - create LMS user w/o learners, User Group & Courses via API
  - add User Group to the Course
  - filter by status, language, user group, date created&modified.
  - search, sorting
*/
import { mockFeatureFlags } from 'cypress/support/helper/api-helper'
import { createName, createEmail } from 'cypress/support/helper/common-util'
import { reverseArray, selectDateFromDatePicker } from 'cypress/support/helper/utils'
import dayjs from 'dayjs'

let adminEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const courseTitle = 'Course-'
const courseIdList: string[] = []
const courseTitleList: string[] = []
const externalIdList: string[] = []
let noOfCourses = 3
let userGroupName: string
let userGroupId: string

describe('Feature: Filtering, Searching and Sorting Courses', () => {
  describe('Create Courses API', () => {
    it(`Setup accounts and create ${noOfCourses} courses via API`, () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)

      userGroupName = createName()
      cy.createUserGroup(adminEmail, password, userGroupName).then(res => {
        userGroupId = res.body._id
      })

      for (let i = 0; i < noOfCourses; i++) {
        courseTitleList.push(`${courseTitle}${i}`)
        const externalIdentifier = `externalId${i}`
        externalIdList.push(externalIdentifier)

        cy.createCourse(adminEmail, password, `${courseTitle}${i}`, true, {
          externalIdentifier
        }).then(courseId => {
          courseIdList[i] = courseId
        })
      }
    })
  })

  describe('Scenario: Course List Sorting and Filtering', () => {
    const draftCourseTitle = 'Draft Course'
    describe('Sorting', () => {
      beforeEach(() => {
        mockFeatureFlags([{ key: 'lx-new-home', value: false }])
        cy.navigateTo('LMS', 'courseware')

        cy.intercept('POST', '/api/courseCollections/search').as('search')
        cy.intercept('GET', '/api/courseCollections?*').as('courseCollections')
      })

      it('Default sort order should be by "Date created" descending', () => {
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date created')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
      })

      it('Sort by "Date created" ascending', () => {
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date created')

        cy.getByTestId('sortDirectionButton').click()
        cy.wait('@search')
        cy.reload()

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(courseTitleList[i])
        })
      })

      it('Sort by "Date modified" descending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Date modified').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date modified')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
      })

      it('Sort by "Date modified" ascending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Date modified').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date modified')

        cy.getByTestId('sortDirectionButton').click()
        waitForSearchResults()

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(courseTitleList[i])
        })
      })

      it('Sort by "Date published" descending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Date published').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date published')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
      })

      it('Sort by "Date published" ascending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Date published').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Date published')

        cy.getByTestId('sortDirectionButton').click()
        waitForSearchResults()

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(courseTitleList[i])
        })
      })

      it('Sort by "Alphabetically" descending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Alphabetically').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Alphabetically')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(courseTitleList[i])
        })
      })

      it('Sort by "Alphabetically" ascending', () => {
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Alphabetically').should('exist').and('be.visible').forceClick().wait('@search')
        cy.getByTestId('dropDownTrigger').should('contain.text', 'Alphabetically')

        cy.getByTestId('sortDirectionButton').click()
        waitForSearchResults()

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
      })

      it('Sort by "Learner display"', () => {
        // this feature is removed when lx-new-home is turned on
        // and will completely be removed when lx-new-home is fully released
        cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

        cy.contains('Learner display')
          .should('exist')
          .and('be.visible')
          .forceClick()
          .wait('@courseCollections')

        cy.getByTestId('dropDownTrigger').should('contain.text', 'Learner display')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(courseTitleList[i])
        })

        cy.contains(
          'Drag and drop courses to configure a global order for your courses on the app.'
        ).should('be.visible')

        cy.contains('Learn more.')
          .should('have.attr', 'href', 'https://support.edapp.com/search-filters-sorting')
          .and('have.attr', 'target', '_blank')
      })
    })

    describe('Sorting with lx-new-home enabled', () => {
      it('Sort by "Collection Order"', () => {
        const courseCollectionTitle = 'Course Collection'

        mockFeatureFlags([{ key: 'lx-new-home', value: true }])
        cy.navigateTo('LMS', 'courseware')

        cy.intercept('GET', '/api/courseCollections?*').as('courseCollections')

        cy.createCourseCollection(adminEmail, password, courseCollectionTitle).then(id => {
          cy.getByTestId('dropDownTrigger').should('exist').and('be.visible').forceClick().wait(500)

          cy.contains('Collection order')
            .should('exist')
            .and('be.visible')
            .forceClick()
            .wait('@courseCollections')

          cy.getByTestId('dropDownTrigger').should('contain.text', 'Collection order')
          cy.contains('Drag and drop course collections to re-order.').should('be.visible')
          cy.getByClassNameLike('CardDetails').should('have.length', 1)
          cy.getByClassNameLike('CardDetails').first().should('have.text', courseCollectionTitle)
          cy.deleteCourseCollection(adminEmail, password, id)
        })
      })
    })

    describe('Searching', () => {
      const searchInput = 'input[placeholder="Search by title or ID"]'

      beforeEach(() => {
        cy.navigateTo('LMS', 'courseware')
        cy.get(searchInput).clear()
        cy.intercept('POST', '/api/courseCollections/search').as('search')
      })

      it('Search by "Course title"', () => {
        cy.get(searchInput).type(courseTitle).wait('@search') //wait for debounce

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses)
        cy.contains(`${noOfCourses} results`).should('be.visible')
      })

      it('Search by "External Id"', () => {
        cy.get(searchInput).type(externalIdList[1]).wait('@search') //wait for debounce
        cy.getByClassNameLike('CardDetails').should('contain.text', courseTitleList[1])
        cy.getByTestIdLike('content-card-contents').should('have.length', 1)
        cy.contains('1 result').should('be.visible')
      })

      it('Search by invalid text', () => {
        cy.get(searchInput).type('non existent course').wait('@search') //wait for debounce

        cy.contains(`We've found no matching courses`).should('be.visible')
        cy.contains(
          `Try adjusting your search terms and filters to find what you're looking for.`
        ).should('be.visible')

        cy.contains('Clear all search and filters').click().wait('@search')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })

        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses)
        cy.contains(`${noOfCourses} results`).should('be.visible')
      })
    })

    describe('Filtering 🌪️', () => {
      const searchInput = 'input[placeholder="Search by title or ID"]'
      // select beforeDay to filter by Date created & modified
      const beforeDay = dayjs().add(-1, 'd')

      beforeEach(() => {
        cy.navigateTo('LMS', 'courseware')
        cy.get(searchInput).clear()
        cy.intercept('POST', '/api/courseCollections/search').as('search')
      })

      it('Should go to Courseware and filter by Published courses', () => {
        cy.getByButtonText('Filters').should('exist').and('be.visible').forceClick().wait(500)
        cy.getByTestId('statusDropDown')
          .find('[class*="ed-select__indicators"]')
          .should('exist')
          .and('be.visible')
          .forceClick()

        cy.contains('Published').forceClick()

        cy.getByButtonText('Apply').click().wait('@search')
        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })
        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses)
        cy.contains(`${noOfCourses} results`).should('be.visible')
      })

      it('Should go to Courseware and filter by Draft courses', () => {
        const extraCoursePayload = {
          internationalisation: {
            locale: 'nl' // select Dutch language
          }
        }

        cy.createCourse(adminEmail, password, draftCourseTitle, false, extraCoursePayload).then(
          courseId => {
            cy.addUserGroupToCourse(adminEmail, password, courseId, [userGroupId], false)
          }
        )

        courseTitleList.push(draftCourseTitle)
        noOfCourses++

        cy.getByButtonText('Filters').should('exist').and('be.visible').forceClick().wait(500)
        cy.getByTestId('statusDropDown')
          .find('[class*="ed-select__indicators"]')
          .should('exist')
          .and('be.visible')
          .forceClick()

        cy.contains('Drafted').forceClick()

        cy.getByButtonText('Apply').click().wait('@search')
        cy.getByClassNameLike('CardDetails').should('contain.text', draftCourseTitle)
        cy.getByTestIdLike('content-card-contents').should('have.length', 1)
        cy.contains('1 result').should('be.visible')
      })

      it('Should go to Courseware and filter by Language', () => {
        cy.navigateTo('LMS', '/courseware')
        cy.getByButtonText('Filters').click()
        cy.contains('Select language').should('exist').and('be.visible').forceClick()
        cy.getByClassNameLike('ed-select__option').contains('English').click()
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should(item => {
          expect(item).to.have.length(noOfCourses - 1)
        })
        // select Dutch
        cy.getByButtonText('Filters').click()
        cy.contains('English').should('exist').and('be.visible').forceClick()
        cy.getByClassNameLike('ed-select__option').contains('Dutch').click()
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses - 3)
        cy.getByClassNameLike('CardDetails').should('contain.text', draftCourseTitle)
      })

      it('Should go to Courseware and filter by User Group', () => {
        cy.navigateTo('LMS', '/courseware')
        cy.getByButtonText('Filters').click()
        cy.contains('Select user group').should('exist').and('be.visible').forceClick()
        cy.getByClassNameLike('ed-select__option').contains(`${userGroupName}`).click()
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses - 3)
        cy.getByClassNameLike('CardDetails').should('contain.text', draftCourseTitle)
      })

      it('Should go to Courseware and filter by Universal Access', () => {
        cy.navigateTo('LMS', '/courseware')
        cy.getByButtonText('Filters').click()
        cy.getByTestId('universal-access-checkbox').click()
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses - 1)
      })

      it('Should go to Courseware and filter by Date Created', () => {
        cy.navigateTo('LMS', '/courseware')
        // Date created = today
        cy.getByButtonText('Filters').click()
        cy.contains('Date created').click()
        cy.getByTestId('dateInput').first().click()
        cy.getByClassNameLike('react-datepicker__day')
        selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), dayjs())
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should(item => {
          expect(item).to.have.length(noOfCourses)
        })
        // Date created < today
        cy.getByButtonText('Filters').click()
        cy.getByButtonText('Reset all').click()
        cy.contains('Date created').click()
        cy.getByTestId('dateInput').last().click()
        selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), beforeDay)
        cy.getByButtonText('Apply').click().wait('@search')

        cy.contains("We've found no matching").should('be.visible')
        cy.getByTestId('block').should('contain.text', `We've found no matching`)
      })

      it('Should go to Courseware and filter by Date Modified', () => {
        cy.navigateTo('LMS', '/courseware')
        // Date modified = today
        cy.getByButtonText('Filters').click()
        cy.contains('Date modified').click()
        cy.getByTestId('dateInput').first().click()
        selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), dayjs())
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses)

        // Date modified < today
        cy.getByButtonText('Filters').click()
        cy.getByButtonText('Reset all').click()
        cy.contains('Date modified').click()
        cy.getByTestId('dateInput').last().click()
        selectDateFromDatePicker(cy.getByClassNameLike('react-datepicker__day'), beforeDay)
        cy.getByButtonText('Apply').click().wait('@search')

        cy.contains("We've found no matching").should('be.visible')
        cy.getByTestId('block').should('contain.text', `We've found no matching`)
      })

      it('Should go to Courseware and Reset all Filters', () => {
        cy.getByButtonText('Filters').should('exist').and('be.visible').forceClick().wait(500)
        cy.contains('Reset all').click()
        cy.getByButtonText('Apply').click().wait('@search')

        cy.getByClassNameLike('CardDetails').each(($courseTitleText, i) => {
          expect($courseTitleText.text()).to.contain(reverseArray(courseTitleList)[i])
        })

        cy.contains(`${noOfCourses} results`).should('be.visible')
        cy.getByTestIdLike('content-card-contents').should('have.length', noOfCourses)
      })
    })
  })
})

const waitForSearchResults = () => {
  cy.wait('@search').then(res => {
    expect(res.response.statusCode).to.equal(200)
    expect(res.response.body).to.be.not.null
  })
  cy.reload()
}
