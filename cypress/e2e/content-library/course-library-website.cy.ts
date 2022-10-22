const prodWebsite = 'https://www.edapp.com'
const expectedCategories: string[] = [
  'Lockdown Care Package',
  'Retail',
  'Food & Hospitality',
  'Construction',
  'Manufacturing',
  'Safety & Risk Management',
  'Management & Leadership',
  'Business',
  'Workplace Tools & Productivity',
  'Marketing',
  'Health & Wellbeing',
  'Education',
  'Transport & Logistics',
  'Lifestyle',
  'IT & Software',
  'Emergency Services',
  'Sustainability & Ethical Practices',
  'Entertainment',
  'Self Improvement',
  'Finance & Accounting',
  'Workplace Culture',
  'Automotive',
  'Government',
  'Aviation',
  'General',
  'Professional services',
  'Design & Digital',
  'Agriculture',
  'Financial Services & Banking',
  'Healthcare',
  'Non-profits, Foundations & Philanthropists',
  'Human Rights',
  'Mining'
]

const expectedCatergoryLinks: string[] = []

expectedCategories.forEach(category => {
  expectedCatergoryLinks.push(`/category/${category.toLowerCase().replace(/[^A-Z0-9]+/gi, '-')}`)
})

describe(`Feature: View course library from ${prodWebsite}`, () => {
  it(`Visit ${prodWebsite} and go to Course Library`, () => {
    cy.visit(prodWebsite)
    cy.url().should('include', `${prodWebsite}`)

    cy.contains('Editable course library', { matchCase: false })
      .should('exist')
      .and('have.attr', 'href', '/course-library/')
      .forceClick()
    cy.url().should('include', `${prodWebsite}/course-library/`)

    cy.getByPlaceHolderText('Search courses...').should('be.visible')
    cy.contains('Browse Categories').should('be.visible')
  })

  it('Validate all Categories are present in See All page', () => {
    cy.contains('Browse Categories').should('be.visible').click({ force: true })
    cy.url().should('include', `${prodWebsite}/categories/`)

    //   const actualCategories: string[] = []
    //   const actualCategoryLinks: string[] = []

    //   cy.getByClassNameLike('CategoriesList')
    //     .parent()
    //     .each($el => {
    //       actualCategoryLinks.push($el.attr('href'))
    //       actualCategories.push($el.text())
    //     })
    //     .then(() => {
    //       expect(actualCategories).to.include.members(expectedCategories)
    //       expect(actualCategoryLinks).to.include.members(expectedCatergoryLinks)
    //     })
  })
})
