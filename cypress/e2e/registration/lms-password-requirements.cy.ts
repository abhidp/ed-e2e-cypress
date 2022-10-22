describe('Feature: Password requirements for LMS registration', () => {
  beforeEach('Navigate to Registration page', () => {
    cy.navigateTo('WEBSITE', 'signup/free')
  })

  it('Clicking Create button without entering any fields - validate errors on all fields', () => {
    cy.getByButtonText('Get started for FREE').click()
    cy.getByName('email').siblings().should('contain.text', 'Please enter a valid email address.')
  })

  it('Validate email errors for a permutation of diff invalid formats', () => {
    const invalidEmails = [
      'email',
      'email@',
      'email@gmail',
      'email@gmail.',
      'email@gmail.c',
      '@gmail.com'
    ]

    invalidEmails.forEach(email => {
      cy.getByName('email').clear().type(email).blur()
      cy.getByName('email').siblings().should('contain.text', 'Please enter a valid email address.')
    })
  })

  it('Validate password errors for a permutation of diff invalid passwords', () => {
    const tickedIcon = '[class*=CircleTickIcon]'
    const invalidPasswords = {
      a: {
        ticked: ['One lowercase letter'],
        unticked: [
          'One uppercase letter',
          'One number or special character',
          '8 characters minimum'
        ]
      },
      aaaa: {
        ticked: ['One lowercase letter'],
        unticked: [
          'One uppercase letter',
          'One number or special character',
          '8 characters minimum'
        ]
      },
      aaaaaaa: {
        ticked: ['One lowercase letter'],
        unticked: [
          'One uppercase letter',
          'One number or special character',
          '8 characters minimum'
        ]
      },
      aaaaaaaa: {
        ticked: ['One lowercase letter', '8 characters minimum'],
        unticked: ['One uppercase letter', 'One number or special character']
      },
      Aaaaaaaa: {
        ticked: ['One lowercase letter', 'One uppercase letter', '8 characters minimum'],
        unticked: ['One number or special character']
      },
      '1aaaaaaa': {
        ticked: ['One lowercase letter', 'One number or special character', '8 characters minimum'],
        unticked: ['One uppercase letter']
      },
      '@aaaaaaa': {
        ticked: ['One lowercase letter', 'One number or special character', '8 characters minimum'],
        unticked: ['One uppercase letter']
      },
      '@aaaaaaaA': {
        ticked: [
          'One lowercase letter',
          'One number or special character',
          '8 characters minimum',
          'One uppercase letter'
        ],
        unticked: null
      }
    }

    Object.entries(invalidPasswords).forEach(val => {
      cy.getByName('password').clear().type(val[0]).blur()

      val[1].ticked.forEach(ticked => {
        cy.contains(ticked).siblings(tickedIcon).should('exist').should('be.visible')
      })

      if (val[1].unticked)
        val[1].unticked.forEach(ticked => {
          cy.contains(ticked).siblings(tickedIcon).should('not.exist')
        })
    })
  })
})
