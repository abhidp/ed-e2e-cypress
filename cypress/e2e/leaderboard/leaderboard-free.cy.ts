import { createEmail } from 'cypress/support/helper/common-util'

let email: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

const selectors = {
  navBar: 'ul.nav.navbar-nav.navbar-left',
  coursewareMenuItem: '#courseware-menu-item',
  coursesMenuItem: '#courses-menu-item',
  leaderboardMenuItem: '[href="/leaderboards"]',
  leaderboardTitleInput: '[placeholder="Leaderboard Title"]',
  button: (text: string) => `button:contains("${text}")`,
  leanersAppInput: (inputName: string) => `input[name="${inputName}"]`
}

//will fix after leaderboard dev is complete
describe('Feature: Leaderboard Free', () => {
  it('LMS: Create an Individual Leaderboard with Learner Access and Save', () => {
    email = createEmail()
    learnerEmail = `edappt+learner+${email}`
    cy.setCookie('email', email)
    cy.setCookie('password', password)

    cy.createLmsAccount(email, password)

    const userRoles = ['app-user', 'prizing-user']
    cy.createLearnerAccount(email, password, learnerEmail, password, userRoles)
    cy.enableLeaderboards(email, password)

    cy.navigateTo('LMS')

    cy.get(selectors.navBar).contains('Course').should('exist')
    cy.get(selectors.coursewareMenuItem).click()
    cy.get(selectors.coursesMenuItem).click()

    cy.url().should('include', 'courseware')

    cy.get('#engage-menu-item').click().find(selectors.leaderboardMenuItem).click()
    cy.url().should('include', '/leaderboards')

    cy.get(selectors.button('Create a leaderboard')).first().click()
    cy.url().should('include', '/leaderboard')

    cy.get(selectors.leaderboardTitleInput).type('Individual Leaderboard')

    cy.intercept('POST', '/api/leaderBoard/definition').as('leaderboardSettingsSaved')
    cy.getByButtonText('Save All Changes').click({ force: true }).wait('@leaderboardSettingsSaved')

    cy.navigateTo('LMS', 'leaderboards')
    cy.getByTestIdLike('table-row').find('td').should('contain.text', 'Individual Leaderboard')
  })

  it('LEARNERS APP: Leaderboard is available for learners', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.getByTestId('app-nav').find('li').contains('Leaderboard').click({ force: true })
    cy.url().should('include', '#leaderboard')

    cy.getByTestIdLike('leaderboard-item').first().click()
    cy.getByTestId('view-head').should('contain.text', 'Individual Leaderboard')
  })

  //TODO: confirm if Edit Leaderboard title is permitted?
  xit('LMS: Edit Leaderboards and Save', () => {
    cy.get(selectors.button('Edit')).first().click()
    cy.url().should('include', '/leaderboard')

    cy.get(selectors.leaderboardTitleInput).type(' Edited Title')

    cy.intercept('PUT', '/api/leaderBoard/definition/**').as('editRequest')
    cy.get(selectors.button('Save')).click({ force: true })
    cy.wait('@editRequest')

    cy.navigateTo('LMS', 'leaderboards')
    cy.url().should('include', 'leaderboards')

    cy.getByTestIdLike('table-row')
      .find('td')
      .should('contain.text', 'Individual Leaderboard Edited Title')
  })

  it('LMS: Remove Leaderboards', () => {
    cy.navigateTo('LMS', 'leaderboards').url().should('include', 'leaderboards')

    cy.getByClassNameLike('TrashIcon').first().click({ force: true })
    cy.getByTestId('dialog')
      .should('be.visible')
      .and(
        'contain.text',
        'This is going to remove all existing rankings. You cannot view this leaderboard anymore. Are you sure?'
      )

    cy.intercept('DELETE', '/api/leaderBoard/definition/**').as('deleteRequest')
    cy.get(selectors.button('Yes')).first().click().wait('@deleteRequest')
    cy.getByTestId('dialog').should('not.exist')

    cy.contains('Use leaderboards to boost engagement through social competition').should(
      'be.visible'
    )
    cy.contains('Create a leaderboard to get started.').should('be.visible')
  })

  it('LEARNERS APP: Leaderboard is NOT available for learners after deletion', () => {
    cy.loginToLearnersAppViaUI(learnerEmail, password)

    cy.navigateTo('LEARNERS_APP', '#leaderboards')
    cy.contains('You have no leaderboards available').should('be.visible')
  })
})
