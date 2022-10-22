const pptxFile = 'courses/samplepptx.pptx'

describe('PPT Upload and Convert from Website', () => {
  it('Visit website and upload ppt', () => {
    cy.navigateTo('WEBSITE','/convert-powerpoint')

    cy.intercept('POST', '/api/courses/public-ppt-upload').as('uploadSuccess')
    cy.get('input[accept=".pptx"]').scrollIntoView().attachFile(pptxFile)
    cy.wait('@uploadSuccess')

    cy.intercept('POST', '/register/anonymous').as('registerAnonymous')

    cy.getByButtonText('Convert my training').forceClick().wait('@registerAnonymous')

    // TODO: include test to ensure it redirects to /better-pptx
  })
})
