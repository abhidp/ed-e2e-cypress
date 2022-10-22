import { createName, createEmail } from 'cypress/support/helper/common-util'

const selectors = {
  usersMenuItem: '#users-menu-item',
  allUserGroupsSelectableList: '[data-testid="selectable-list-item"]',
  allUsersSelectableList: `[data-testid="selectable-list-all-users"]`,
  managersSelectableList: `[data-testid="selectable-list-all-managers"]`,
  allPrizeDrawsSelectableList: `[data-testid="selectable-list-all-draws"]`,
  starBarGameDropdown: `[data-testid="dropdown-starbar-game"]`,
  selectableListSelected: 'ul.selectable-list-selected',

  dropdownOption: (label: string) => `div.Select__option:contains("${label}")`,
  link: (label: string) => `a:contains("${label}")`,
  linkBtn: (label: string) => `a.btn:contains("${label}")`,
  btn: (label: string) => `button:contains("${label}")`,
  tooltip: (label: string) => `div.tooltip-inner:contains("${label}")`,
  input: (placeholder: string) => `input[placeholder="${placeholder}"]`,
  radio: (label: string) => `div.radio:contains("${label}")`,
  selectableListItem: (label: string) => `li:contains("${label}")`,
  paragraph: (text: string) => `p:contains("${text}")`,
  checkbox: (label: string) => `div.checkbox:contains("${label}")`,
  checkboxText: (label: string) => `strong:contains("${label}")`
}

let adminEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: User Group Collection', () => {
  describe('Scenario: Create User Group Collection', () => {
    it('Setup Tests', () => {
      adminEmail = createEmail()

      cy.createLmsAccount(adminEmail, password)
      cy.upgradeToEnterprisePlan(adminEmail, password)
    })

    it('Navidate to User Groups page', () => {
      cy.navigateTo('LMS')
      cy.url().should('include', '/home')

      cy.get(selectors.usersMenuItem).click().get(selectors.link('User Groups')).click()
      cy.url().should('include', 'user-groups')
    })

    it('Click "New user group" button, Save button should be disabled', () => {
      cy.get(selectors.linkBtn('New user group')).click()
      cy.get(selectors.btn('Save')).should('have.attr', 'disabled')
    })

    it('Type user group name into "Name your user group" field, "Save" button should be enabled', () => {
      const userGroupName = createName()
      cy.get(selectors.input('Name your user group')).type(userGroupName)
      cy.get(selectors.btn('Save')).should('not.have.attr', 'disabled')
    })

    it('Choose "User Group Collection" radio button, Save and get redirected to new user group', () => {
      cy.getByTestId('group-collection-radio').find('[class*="RadioIcon"]').click()
      saveUserGroupCollection()
      cy.wait('@saveUserGroup').then(ug => {
        expect(ug.response.body).to.have.property('_id')
        const id = ug.response.body._id
        cy.url().should('include', `/v2/user-group/${id}`)
      })
    })
  })

  describe('Scenario: Assign Groups to a User Group Collection', () => {
    it('Create user groups "Australia" and "Brazil" via API', () => {
      cy.createUserGroup(adminEmail, password, 'Australia')
      cy.createUserGroup(adminEmail, password, 'Brazil')
    })

    it('Navigate to UGC and assign UGs Australia and Brazil', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()

      cy.getByPlaceHolderText('Search for a usergroup name').should('be.visible') // waiting until data is loaded inside section

      cy.get(selectors.allUserGroupsSelectableList).contains('Australia').click()
      cy.contains('Brazil').click()

      saveUserGroupCollection()
      cy.wait('@saveUserGroup')
    })
  })

  describe('Scenario: Assign Managers to a User Group Collection', () => {
    const user = 'Yoda'
    const email = `${user}+${createEmail()}`

    it('Create user called "Yoda" via API and navigate to UGC', () => {
      const roles = ['app-user']
      cy.createLearnerAccount(adminEmail, password, email, password, roles)
    })

    it('Select and Assign the manager Yoda to the user grp collection', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()

      cy.contains(email) // waiting until data is loaded inside container

      cy.get(selectors.allUserGroupsSelectableList).contains(email).forceClick()
      saveUserGroupCollection()
      cy.wait('@saveUserGroup')
    })
  })

  describe('Scenario: I should not be able to assign courses to User Group Collection', () => {
    it('Try to assign courses to UGC, and validate error message', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()

      cy.get(
        selectors.paragraph(
          'Course access for a user group collection can be configured from the Course Details page of a specific course.'
        )
      ).should('be.visible')
    })
  })

  describe('Scenario: Assign Prize Draws to a User Group Collection', () => {
    const prizeDraw = 'Playstation 4'
    let prizeDrawId: string

    it('Create prize draw via API', () => {
      cy.createPrizeDraw(adminEmail, password, {
        name: prizeDraw,
        gameType: 'chance'
      }).then(response => {
        prizeDrawId = `${response}`

        // edit PrizeDraw > needed to get prize in User Group Collection
        cy.createPrizeDraw(adminEmail, password, {
          id: prizeDrawId,
          name: prizeDraw,
          gameType: 'chance'
        })
      })
    })

    it('Select and assign the prize draw to the user group collection', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()

      cy.contains(prizeDraw) // waiting until data is loaded inside container

      cy.get(selectors.allUserGroupsSelectableList).contains(prizeDraw).click()
      saveUserGroupCollection()
      cy.wait('@saveUserGroup')
    })
  })

  describe('Scenario: Disable Star Bar for User Group Collection', () => {
    it('Create UG and Navidate to UGC', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()
    })

    it('Check Override and Star Bar and validaate disabling star bar changes are saved', () => {
      cy.getByTestId('checkbox-label').click() // tick "Override" checkbox

      cy.contains('Star bar').parent().find('[data-testid="checkbox-label"]').click()

      saveUserGroupCollection()

      cy.wait('@saveUserGroup').then(ug => {
        expect(ug.response.body.lottery.enabled).to.equal(true)
        expect(ug.response.body.lottery.enableSpinToWin).to.equal(false)
      })
    })

    it('Tick Star Bar and Validate enabling Star bar changes are saved', () => {
      cy.contains('Star bar').parent().find('[data-testid="checkbox-label"]').click()

      saveUserGroupCollection()

      cy.wait('@saveUserGroup').then(ug => {
        expect(ug.response.body.lottery.enabled).to.equal(true)
        expect(ug.response.body.lottery.enableSpinToWin).to.equal(true)
      })
    })
  })

  describe('Scenario: Change Star Bar Game for User Group Collection', () => {
    const prizeDraw = 'Xbox One'
    let prizeDrawId: string

    it('Create a prize draw "Xbox One" via API', () => {
      cy.createPrizeDraw(adminEmail, password, {
        name: prizeDraw,
        gameType: 'chance'
      }).then(response => {
        prizeDrawId = `${response}`

        // edit PrizeDraw > needed to get prize in User Group Collection
        cy.createPrizeDraw(adminEmail, password, {
          id: prizeDrawId,
          name: prizeDraw,
          gameType: 'chance'
        })
      })
    })

    it('Assign the prize draw Xbox One to the user grp collection', () => {
      createUsrGrpAndNavigateToUsrGrpCollection()

      cy.contains(prizeDraw) // waiting until data is loaded inside container

      cy.get(selectors.allUserGroupsSelectableList).contains(prizeDraw).should('be.visible')
    })

    it('Tick "Override and should be able to select the game for the UGC', () => {
      cy.getByTestId('checkbox-label').click() // tick "Override" checkbox

      cy.get(selectors.starBarGameDropdown).click()

      cy.get(selectors.starBarGameDropdown)
        .get(selectors.dropdownOption('Gift Grab'))
        .should('exist')

      cy.get(selectors.starBarGameDropdown)
        .get(selectors.dropdownOption('Spin To Win'))
        .should('exist')

      cy.get(selectors.starBarGameDropdown)
        .get(selectors.dropdownOption('Star Bids'))
        .should('exist')

      cy.get(selectors.starBarGameDropdown)
        .get(selectors.dropdownOption('Lucky Dip'))
        .should('exist')
    })

    it('Save the UGC and validate Star Bar changes are saved', () => {
      saveUserGroupCollection()

      cy.wait('@saveUserGroup').then(() => {
        // TODO
        // the api doesn't tell me what game the user group should be
      })
    })
  })
})

const saveUserGroupCollection = () => {
  cy.intercept('POST', '/v2/user-group/*/save').as('saveUserGroup')
  cy.get(selectors.btn('Save')).click()
}

const createUsrGrpAndNavigateToUsrGrpCollection = () => {
  const userGroupName = createName()
  cy.createUserGroup(adminEmail, password, userGroupName, 'groups').then(response => {
    const id = response.body._id
    cy.intercept('GET', '/v2/user-group/*/data').as('fetchUserGroup')
    cy.navigateTo('LMS', `v2/user-group/${id}`)
    cy.wait('@fetchUserGroup')
    cy.url().should('include', `v2/user-group/${id}`)
  })
}
