/*
  Register from Course Library via edapp.com:
  - visit edapp.com where search by Agriculture category -> verify url
  - select first course from list -> edit a course 
  - click on "Sign up to save" button -> verify whether "Sign up to save" button is visible
  - click on "Sign in" button -> verify whether "Sign in" button is enabled 
  - click on "Sign up to" button from "Sign in" popup -> verify whether registration  url, text and "Get started for FREE" is enabled
*/

describe('Register from Course Library via edapp.com 🧑‍🎓', () => {
  let redirectUrl: string

  it('Should go to Course Library via website and Edit a Course 📖 ', () => {
    cy.navigateTo('WEBSITE', '/search/?searchTerm=Agriculture')
    cy.url().should('include', 'Agriculture')

    cy.getByTestIdLike('content-card-contents').first().forceClick()

    cy.intercept('POST', '/register/anonymous-import-course').as('anonymousimportcourse')

    cy.getByButtonText('Edit this course')
      .forceClick()
      .wait('@anonymousimportcourse')
      .then(res => {
        redirectUrl = res.response.body.redirect
      })
  })

  it('Should go to Edit Course Link and Sign in & Sign up 🧑‍🎓 ', () => {
    cy.visit(redirectUrl)
    cy.url().should('include', 'edit')

    cy.contains(`Sign up to save`).should('be.visible').click()

    cy.intercept('POST', '/lesson/save').as('lessonsave')

    cy.contains(`Sign in`).should('be.visible').click()
    cy.wait('@lessonsave').then(res => {
      expect(res.response.statusCode).to.eql(200)
    })

    cy.contains(`Sign in to your account`).should('be.visible')
    cy.getByButtonText('Sign in').should('be.enabled')

    // get "Sign up" button -> parent href
    cy.contains('a', 'Sign up').parent().invoke('removeAttr', 'target').click()

    cy.url().should('include', 'signup/free')
    cy.contains(`Create your free account today!`).should('be.visible')
    cy.getByButtonText('Get started for FREE').should('be.enabled')
  })
})
