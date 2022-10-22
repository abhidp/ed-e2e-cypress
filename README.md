[![CircleCI](https://circleci.com/bitbucket/ed-app/ed-e2e-tests/tree/master.svg?style=shield&circle-token=21915a2540af21c3f12b8555ad84230ad9688544)](https://dashboard.cypress.io/organizations/8c381357-66ea-421f-b4bc-8e9d9642d5af/projects)

# Getting Started

### To bootstrap the project:

- `cd e2e-tests`
- Install all dependencies: `yarn install`
- Get `.env` file from 1Password (EdApp Vault) : https://start.1password.com/open/i?a=UXWQM2CCJBHN7F2GII737CITN4&v=fzrmsbxc6cidxxdvrlor6hmjfm&i=dttnunrbozbqjjnyv5vkd52nee&h=safetyculture.1password.com and place it in the root of `e2e-tests` folder

- **!! WARNING !! NEVER EVER COMMIT `.env` TO BITBUCKET** as it contains sensitive information and could lead to security breaches. This file is already added to `.gitignore` so it won't get auto-commited when you push your code. Never remove `.env` from `.gitignore`

### Local Test Data setup:

- If you are running tests for the first time in your local, you need to do the following one-time setup:

  - Create a new account in LMS and replace the following variables in the `.env` file with its credentials:
    - `SUPER_ADMIN_EMAIL` - Email of the new account
    - `SUPER_ADMIN_PASSWORD` - Plaintext password of the new account
  - Add `ed-admin` role to this account in MongoDB, e.g.

        db.appusers.updateOne(
          { email: '{{NEW-ACCOUNT-EMAIL}}' },
          {
            $push: {
              roles: {
                $each: [
                  {
                    subject: {
                      userGroups: [],
                      allAccounts: false,
                    },
                    _id: ObjectId('5e588133b61524072b73f79a'),
                    roleId: 'ed-admin',
                  },
                ],
                $position: 0,
              },
            },
          }
        );

- This super admin account upgrades other test accounts to enterprise plans during runtime

### Test Execution:

Tests will only run if you have `.env` file present at the root of the project. This file is not committed to BitBucket and stored in AWS S3. Check steps under `Bootstrap` section above on how to get this file.

There are two ways to run tests:

- opening Cypress Interactive GUI test runner and selecting tests to run (mainly used for development)
- running tests via Cypress command line (mainly used for running tests in CI, can be used locally as well)

#### GUI Open Mode for running from local machine

- all scripts with the format `test:open` open the Cypress Interactive GUI Test runner
- `test:open:local` : opens all specs against LOCAL dev environment
- `test:open:staging` : open all specs against STAGING environment
- `test:open:branch` : open all specs against a feature BRANCH deployed pointing to staging. See details below under CI/CD to see how to deploy a feature branch pointing to staging. Eg. `yarn test:open:branch --branch mybranch`
- `test:open:production` : open all specs against PRODUCTION environment

Results can be viewed on Cypress Dashboard for Staging and Production runs

### Journeys

The concept of _journeys_ is to get the test from state A to state B. They are not testing anything. Most times they should be only calling api endpoints to get the database/server ready for the test to be run
Journeys are present under `cypress/support/journeys`

## Data Selectors

[Documentation Here](https://ed-app.atlassian.net/wiki/spaces/DEV/pages/398196856/Automation+Tests+-+Data+Selectors)

## CI/CD

- All tests run on the PR build on Buildkite after Feature branch environment
- After merge to `master` all tests on STAGING environment (see run details on Cypress dashboard)
- After release to PROD, smoke tests run on PRODUCTION environment (see run details on Cypress dashboard)

## Cypress Dashboard

Tests executions in CI can be tracked via [Cypress Dashboard](https://dashboard.cypress.io/projects/swgayh/runs). These runs contain videos and screenshots of failed tests.
