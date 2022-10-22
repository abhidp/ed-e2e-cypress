'use strict'

const puppeteer = require('puppeteer-core')
let deputyIntegrated

module.exports.deputyConnect = async function deputyConnect(options) {
  const width = 1280
  const height = 1024
  const cookies = options.cookies
  const lmsIntegrationsUrl = `${options.lmsUrl}/integrations/deputy`

  const browser = await puppeteer.launch({
    headless: options.browser.isHeadless,
    executablePath: options.browser.path,
    args: [`--window-size=${width},${height}`, '--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.setViewport({ width, height })
  await page.setCookie(...cookies)
  await page.goto(lmsIntegrationsUrl, { waitUntil: 'load', timeout: 0 })

  await page.waitForSelector('button[data-testid="button"]', {
    visible: true,
    delay: 10000
  })
  await page.click('button[data-testid="button"]')

  const authorizeButton = "[id='btnAuthorize']"
  await page.waitForSelector(authorizeButton)
  await page.click(authorizeButton)

  const closeConfirmationDialog = '[data-testid="close-dialog-button"]'
  await page.waitForSelector(closeConfirmationDialog)
  await page.click(closeConfirmationDialog)

  await page.waitForResponse(
    response => response.url().includes(options.hippoIntegrationsUrl) && response.status() === 200
  )

  await browser.close()

  return null
}
