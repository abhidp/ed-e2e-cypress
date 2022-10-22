'use strict'

const puppeteer = require('puppeteer-core')
let ssoLink

module.exports.MicrosoftSingleSignOn = async function MicrosoftSingleSignOn(options) {
  const width = 800
  const height = 600

  const browser = await puppeteer.launch({
    headless: options.browser.isHeadless,
    executablePath: options.browser.path,
    args: [`--window-size=${width},${height}`, '--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.setViewport({ width, height })
  await page.goto(options.ssoLoginUrl, { waitUntil: 'networkidle2' })

  await typeUsername({ page, options })
  await typePassword({ page, options })

  await finalizeSession({ page, browser })
  return ssoLink
}

async function typeUsername({ page, options } = {}) {
  await page.waitForSelector("[name='businessId']")
  await page.type("[name='businessId']", options.businessId)

  await page.keyboard.press('Enter')

  await page.waitForSelector('input[name=loginfmt]:not(.moveOffScreen)', {
    visible: true,
    delay: 10000
  })
  await page.type('input[name=loginfmt]', options.username, { delay: 10 })
  await page.click('input[type=submit]')
}

async function typePassword({ page, options } = {}) {
  await page.waitForSelector(
    'input[name=Password]:not(.moveOffScreen),input[name=passwd]:not(.moveOffScreen)',
    { visible: true, delay: 10000 }
  )
  await page.type('input[name=passwd]', options.password, { delay: 10 })

  await page.setRequestInterception(true)
  await page.on('request', interceptedRequest => {
    if (interceptedRequest.url().includes('redirect-app-url?url=https'))
      ssoLink = decodeURIComponent(interceptedRequest.url().split('url=').pop())

    interceptedRequest.continue()
    return ssoLink
  })

  await page.click('input[value="Sign in"]')
  await page.waitForNavigation()
  await page.click('input[id="idBtn_Back"]')
}

async function finalizeSession({ page, browser } = {}) {
  await page.waitForResponse(
    response => response.url().includes('/css/email/fonts.css') && response.status() === 200
  )
  await browser.close()
}
