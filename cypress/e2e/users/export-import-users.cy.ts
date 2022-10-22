import { createEmail } from 'cypress/support/helper/common-util'

let adminEmail: string
let learnerEmail: string
let learnerId: string

const firstName = 'firstName'
const lastName = 'lastName'
const csvHeaderForExportCSV =
  'email (required),username (optional),firstname (optional),lastname (optional),usergroups (optional),roles (optional),dateregistered,password (optional),externalid (optional)'
const csvHeaderForTemplate =
  'email (required),username (optional),firstname (optional),lastname (optional),usergroups (optional),roles (optional),password (optional),externalid (optional)'

const immutableEmail = 'immutableemail@gmail.com'
const usersPath = 'cypress/fixtures/users'
const password = Cypress.env('COMMON_TEST_PASSWORD')

describe('Feature: Export and Import Users', () => {
  beforeEach(() => {
    cy.intercept('GET', 'api/users/export').as('exportUsers')
    cy.intercept('POST', 'api/users/import').as('importUsers')
  })

  it(`Should create an LMS account and Learner with immutable Email`, () => {
    adminEmail = createEmail()

    const lmsEmail = `lms+${adminEmail}`
    learnerEmail = `edappt+learner+${lmsEmail}`
    cy.createLmsAccount(lmsEmail, password)

    // create a Learner with immutableEmail and unique username
    // to test validation where 2 users with the same email outside org
    cy.createLearnerAccount(
      lmsEmail,
      password,
      immutableEmail, // email = immutableEmail
      password,
      ['app-user'],
      firstName,
      lastName,
      learnerEmail // username = email
    ).then(learner => {
      learnerId = learner.body.id
      cy.task('setValue', { learnerId })
    })
  })

  it(`Should create an LMS account and Learners`, () => {
    cy.createLmsAccount(adminEmail, password)
    cy.upgradeToEnterprisePlan(adminEmail, password)
    learnerEmail = `edappt+learner+${adminEmail}`

    cy.createLearnerAccount(
      adminEmail,
      password,
      learnerEmail,
      password,
      ['app-user'],
      firstName,
      lastName
    ).then(learner => {
      learnerId = learner.body.id
      cy.task('setValue', { learnerId })
    })
  })

  it(`Should go to Users and Download template, Export Users and Validate Users CSV`, () => {
    cy.intercept('GET', 'api/users/csv-template-export').as('exportTemplate')

    cy.navigateTo('LMS', '/v2/users')

    // download template
    cy.getByButtonText('Upload CSV')
      .click()
      .getByTestId('user-upload-csv-dialog')
      .getByButtonText('Download template')
      .should('exist')
      .and('be.visible')
      .click()
      .wait('@exportTemplate')

    const template = Cypress.config('downloadsFolder') + '/users-upload-template.csv'

    // assertion
    cy.readFile(`${template}`, 'binary', { timeout: 30000 })
      .should('exist')
      .and('contain', csvHeaderForTemplate)

    // Export Users CSV
    cy.getByButtonText('Export users')
      .should('exist')
      .and('be.visible')
      .click()
      .wait('@exportUsers')
      .then(({ response }) => {
        // write response data to a fixture file
        cy.writeFile(`${usersPath}/users.csv`, response.body).then(() => {
          // assertion
          cy.readFile(`${usersPath}/users.csv`, 'binary', { timeout: 30000 })
            .should('exist')
            .and('contain', csvHeaderForExportCSV)
            .and('contain', `${adminEmail},${adminEmail},,,,Content Author; Learner; Reviewer,`)
            .and(
              'contain',
              `${learnerEmail},${learnerEmail},${firstName},${lastName},,Learner; Prizing User,`
            )
        })
      })
  })

  it(`Should go to Users and Succesfully Import Users CSV`, () => {
    cy.navigateTo('LMS', '/v2/users')

    // Export Users CSV
    cy.getByButtonText('Upload CSV')
      .click()
      .getByTestId('user-upload-csv-dialog')
      .getByButtonText('Export users')
      .click()
      .wait('@exportUsers')
      .then(({ response }) => {
        // write response data to a fixture file
        cy.writeFile(`${usersPath}/users.csv`, response.body).then(() => {
          // assertion
          cy.readFile(`${usersPath}/users.csv`, 'binary', { timeout: 30000 })
            .should('exist')
            .then(() => {
              // Import Users CSV
              cy.get('input[type=file]').selectFile(`${usersPath}/users.csv`, { force: true })
              cy.getByButtonText('Next').click()
              cy.contains('Send invitation email to new users')
              cy.getByTestId('user-upload-csv-dialog')
                .find('button')
                .contains('Upload')
                .click()
                .wait('@importUsers')
                .getByButtonText('Continue')
                .click()

              // verify grid
              cy.get('tbody').should('contain.text', adminEmail)
              cy.get('tbody').should('contain.text', learnerEmail)
            })
        })
      })
  })

  it(`Should go to Users and Import Users CSV with Validation Errors, Export errors to CSV`, () => {
    cy.navigateTo('LMS', '/v2/users')

    // import Empty CSV
    cy.getByButtonText('Upload CSV').click()
    cy.get('input[type=file]').selectFile(`${usersPath}/usersEmpty.csv`, { force: true })
    cy.getByButtonText('Next').click()
    cy.contains('Send invitation email to new users')
    cy.getByTestId('user-upload-csv-dialog')
      .find('button')
      .contains('Upload')
      .click()
      .wait('@importUsers')

    // error Dialog - No user info provided
    cy.getByTestId('user-upload-csv-dialog').should(
      'contain.text',
      'Your file was unable to be uploaded'
    )
    cy.getByTestId('error-container').should('contain.text', 'Error: No user info provided')
    cy.contains(
      'If you need help, email us at hello@edapp.com with your Excel file and a copy of the above errors.'
    )
    cy.getByButtonText('Export errors').should('exist')
    cy.getByButtonText('Retry').should('exist')

    cy.getByButtonText('Cancel').should('exist').click()

    // import Invalid CSV
    cy.getByButtonText('Upload CSV').click()
    cy.get('input[type=file]').selectFile(`${usersPath}/usersInconsistentNumColumns.csv`, {
      force: true
    })
    cy.getByButtonText('Next').click()
    cy.contains('Send invitation email to new users')
    cy.getByTestId('user-upload-csv-dialog')
      .find('button')
      .contains('Upload')
      .click()
      .wait('@importUsers')

    // error Dialog - inconsistent number of columns
    cy.getByTestId('user-upload-csv-dialog').should(
      'contain.text',
      'Your file was unable to be uploaded'
    )
    cy.getByTestId('error-container').should(
      'contain.text',
      'Error: An inconsistent number of columns has been detected.'
    )

    cy.getByButtonText('Retry').should('exist').click()

    // Import Invalid CSV
    cy.getByTestId('user-upload-csv-dialog')
      .get('input[type=file]')
      .selectFile(`${usersPath}/usersInvalid.csv`, { force: true })
    cy.getByButtonText('Next').click()
    cy.contains('Send invitation email to new users')
    cy.getByTestId('user-upload-csv-dialog')
      .find('button')
      .contains('Upload')
      .click()
      .wait('@importUsers')

    // error Dialog
    cy.getByTestId('user-upload-csv-dialog').should(
      'contain.text',
      'Your file was unable to be uploaded'
    )
    cy.getByTestId('error-container')
      .should('contain.text', 'A2: User without email')
      .should(
        'contain.text',
        'G2: Password minimum length 8 characters & must contain 1 uppercase letter & must contain 1 number or special character !@#$%'
      )
      .and('contain.text', 'A3: User without email')
      .and(
        'contain.text',
        'B3: Duplicate username, username already in use in your csv file username'
      )
      .and('contain.text', 'A4: Email not valid invalidemail')
      .and('contain.text', 'E2: Invalid user group usergroups')
      .and(
        'contain.text',
        'A5: Duplicate email address, there is another user with this email address outside your organisation immutableemail@gmail.com'
      )

    cy.getByButtonText('Export errors').should('exist').click()

    // export errors
    const csvErrors = Cypress.config('downloadsFolder') + '/user-upload-csv-errors.csv'
    cy.readFile(csvErrors, 'binary', { timeout: 30000 })
      .should('exist')
      .and('contain', 'cell,message,reference')
      .and('contain', '"A2","User without email"')
      .and(
        'contain',
        '"G2","Password minimum length 8 characters & must contain 1 uppercase letter & must contain 1 number or special character","!@#$%"'
      )
      .and('contain', '"A3","User without email"')
      .and(
        'contain',
        '"B3","Duplicate username, username already in use in your csv file","username"'
      )
      .and('contain', '"A4","Email not valid","invalidemail"')
      .and('contain', '"E2","Invalid user group","usergroups"')
      .and(
        'contain',
        '"A5","Duplicate email address, there is another user with this email address outside your organisation","immutableemail@gmail.com"'
      )
  })
})
