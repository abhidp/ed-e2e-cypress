const argv = require('minimist')(process.argv.slice(2))
const { getShortBranchName, getSecrets } = require('./helper')

async function getEnv(env) {
  await getSecrets(env)

  const stagingEnvConfig = {
    HIPPO: 'https://staging3-hippo.edapp.com',
    EMILY_API: 'https://staging3-api.edapp.com',
    LMS: 'https://staging-cms.edapp.com',
    LEARNERS_APP: 'https://staging-web.edapp.com',
    WEBSITE: 'https://staging-site.edapp.com',
    PUBLIC_API: 'https://staging-rest.edapp.com',
    NODE_ENV: 'STAGING'
  }

  switch (env.toUpperCase()) {
    case 'LOCAL':
      return {
        HIPPO: 'http://localhost:5000',
        EMILY_API: 'http://localhost:8083',
        LMS: 'http://localhost:8082',
        LEARNERS_APP: 'http://localhost:3333',
        WEBSITE: 'http://localhost:3335',
        NODE_ENV: 'LOCAL',
        PUBLIC_API: 'http://localhost:5000'
      }

    case 'STAGING':
      return stagingEnvConfig

    case 'PROD':
    case 'PRODUCTION':
      return {
        HIPPO: 'https://hippo.edapp.com',
        EMILY_API: 'https://api.edapp.com',
        LMS: 'https://admin.edapp.com',
        LEARNERS_APP: 'https://web.edapp.com',
        WEBSITE: 'https://edapp.com',
        PUBLIC_API: 'https://rest.edapp.com',
        NODE_ENV: 'PROD'
      }

    case 'BRANCH':
      const SHORT_BRANCH_NAME = await getShortBranchName(await completeBranchName())
      let envConfig = {}

      SHORT_BRANCH_NAME.toLowerCase().includes('staging')
        ? (envConfig = stagingEnvConfig)
        : (envConfig = {
            HIPPO: `https://hippo-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            EMILY_API: `https://api-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            LMS: `https://cms-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            LEARNERS_APP: `https://web-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            WEBSITE: `https://website-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            PUBLIC_API: `https://rest-${SHORT_BRANCH_NAME}.staging.edapp.com`,
            NODE_ENV: 'STAGING'
          })
      return envConfig

    default:
      return stagingEnvConfig
  }
}

async function completeBranchName() {
  if (argv.branch) {
    return argv.branch
  } else {
    console.error(
      `
      You did not specifiy the branch name.
      Please provide the full branch name using the  --branch agrument.
      Valid Examples:
        --branch=ED-15114-be---add-v2-endpoint-for-reset-ready
        --branch=feature/my-cool-new-feature
        --branch=bugfix/ED-98765-squashed-100-bugs
      
      Providing only the branch name without the /feature or /bugfix prefix also work
      Eg:
        --branch=my-cool-new-feature
        --branch=ED-98765-squashed-100-bugs
      `
    )
    process.exit(1)
  }
}

module.exports = { getEnv, completeBranchName }
