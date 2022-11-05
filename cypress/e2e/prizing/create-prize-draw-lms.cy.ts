import { createEmail } from 'cypress/support/helper/common-util'
import dayjs from 'dayjs'

const selectors = {
  engageMenuItem: '#engage-menu-item',
  prizeDrawsMenuItem: "[id='prize draws-menu-item']",
  createDrawButton: `[href='/draw/new']`,
  drawNameInput: `[name="draw.name"]`,
  drawGameType: `[name="draw.gameType"]`,
  uploadImageButton: `[data-testid="uploadImageButton"]`,
  saveMsg: '#save-msg',
  addPrizeBtn: `btn[id="add-prize"]`,
  codesAvailable: '#codes-available',
  removeCodeButton: 'btn[title="Remove Code"]',
  removeCodeModalDialog: '.modal-content',
  crumb: (text: string) => `[class=crumb-title]:contains("${text}")`,
  button: (text: string) => `[data-testid=button]:contains("${text}")`
}

let adminUser: string
let learnerEmail: string
const password = Cypress.env('COMMON_TEST_PASSWORD')
const prizeBackgroundImage = 'prizing/prize-background.jpg'
const prizeDrawName = 'ED-13668: Create Prize Draw'
const prizeName = 'ED-13668: Prize'

describe('Feature: Create Prize Draw', () => {
  describe('LMS Admin sets up Prizing', () => {
    beforeEach('Setup Routes', () => {
      cy.intercept({ method: 'POST', url: '/draw/save' }).as('drawSaved')
      cy.intercept({ method: 'POST', url: '/draw-prize/save' }).as('prizeSaved')
      cy.intercept({ method: 'POST', url: '/draw-prize/*/remove' }).as('prizeRemoved')
    })

    it('Setup: Create LMS Admin and Learner user', () => {
      adminUser = createEmail()
      learnerEmail = `edappt+learner+${adminUser}`

      cy.setCookie('email', learnerEmail)
      cy.createLmsAccount(adminUser, password)

      cy.createLearnerAccount(adminUser, password, learnerEmail, password, [
        'app-user',
        'prizing-user'
      ])
      cy.enableLeaderboards(adminUser, password)

      cy.log(adminUser)
      cy.upgradeToEnterprisePlan(adminUser, password)
    })

    it('Create a Prize Draw', () => {
      cy.navigateTo('LMS')
      cy.get(selectors.engageMenuItem).click()
      cy.get(selectors.prizeDrawsMenuItem).click()
      cy.url().should('include', 'draws')

      cy.get(selectors.createDrawButton).click().url().should('include', '/draw/new')

      cy.get(selectors.drawNameInput).type(prizeDrawName).wait('@drawSaved')
      cy.get(selectors.saveMsg).should('be.visible')

      cy.get(selectors.drawGameType)
        .select('Gift Grab/Spin To Win/Lucky Dip', { force: true })
        .wait('@drawSaved')
      cy.get(selectors.saveMsg).should('be.visible')

      cy.get('[type="file"]').attachFile(prizeBackgroundImage).wait('@drawSaved')
      cy.get(selectors.saveMsg).should('be.visible')

      cy.getByTestId('fileinput-thumbnail').should('exist').and('be.visible')

      cy.getByName('draw.start')
        .click()
        .get('[class="day active today"]')
        .first()
        .click({ force: true })
        .wait('@drawSaved')
      cy.get(selectors.saveMsg).should('be.visible')

      const endAfter10Minutes = dayjs().add(10, 'minutes').format('MMM DD, YYYY hh:mm A')
      cy.getByName('draw.end').clear().type(endAfter10Minutes).wait('@drawSaved')

      // create a Prize
      cy.createPrize(adminUser, password, prizeName)
    })

    //skipped due to the fact is no deterministic way to know when data allowed and rendered in prize group page
    // https://ed-app.atlassian.net/browse/ED-25036
    // https://ed-app.atlassian.net/browse/ED-24971
    xit('Add a new prize by Importing CSV, adding manually and verify added prizes', () => {
      cy.navigateTo('LMS', 'draws')
      cy.contains(prizeDrawName).should('be.visible').click()

      cy.contains('Add a new prize').click()

      cy.url().should('include', '/draw-prize/new?draw=')

      cy.reload() // FE issue: page needs to be reloaded to get prize options https://ed-app.atlassian.net/browse/ED-25036

      // select a prize
      cy.getByName('draw_prize.itemId')
      cy.get('#selected-prize').focus()
      cy.get('#selected-prize').select('Amazon Gift Card') // FE issue: event selection is not triggered
      cy.get('#selected-prize').select(prizeName).wait('@prizeSaved')

      cy.get(selectors.addPrizeBtn).click({ force: true })
      cy.getByName('draw_prize.prizes[0][code][value]').type('CYPRESS')
      cy.getByName('draw_prize.prizes[0][value][value]').type('10')
      cy.get('btn[id="save-prize"]').click().wait('@prizeSaved')

      cy.get('#csv-input').attachFile('prizing/prizing.csv').wait('@prizeSaved')
      //cy.reload() // FE issue: https://ed-app.atlassian.net/browse/ED-24971

      cy.getByClassNameLike('crumb-title').contains('Draw').click()
      cy.getByClassNameLike('table-striped').contains(prizeName).click()

      cy.getByName('draw_prize.itemId')
      cy.get(selectors.codesAvailable).should('have.have.attr', 'value', '6')

      cy.get(selectors.removeCodeButton).first().click()
      cy.get(selectors.removeCodeModalDialog)
        .should('exist')
        .and('be.visible')
        .contains('Confirm')
        .click()
        .wait('@prizeSaved')
      cy.reload()

      cy.get(selectors.codesAvailable).should('have.have.attr', 'value', '5')

      cy.get(selectors.crumb('Draw')).click()
    })

    xit('Remove draw prize', () => {
      cy.get('[title="Remove draw prize"]').click()

      cy.getByClassNameLike('modal-content').should('be.visible')
      cy.get('.modal-body').get('h3').should('contain.text', 'Remove draw')
      cy.get('.modal-body').should(
        'contain.text',
        'Are you sure you want to remove this draw prize?'
      )
      cy.get('.modal-footer').should('contain.text', 'Confirm').and('contain.text', 'Cancel')

      cy.contains('Cancel').click()
      cy.getByClassNameLike('modal-content').should('not.be.visible')

      cy.get('[title="Remove draw prize"]').click()

      cy.contains('Confirm')
        .then($el => {
          $el.click()
        })
        .wait('@prizeRemoved')

      cy.contains('iTunes Voucher').should('not.exist')
    })
  })
})
