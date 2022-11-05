#!/bin/bash

set -euo pipefail

echo "--- Docker and Environment Setup"

ECR_PREFIX="457923578311.dkr.ecr.us-east-1.amazonaws.com"
BRANCH="${BUILDKITE_BRANCH:-${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}}"
FORMATED_BRANCH_NAME="$(echo "${BRANCH}" | sed 's/[\/\\]/-/g')"
fullImageRepo="${ECR_PREFIX}/e2e"

# This adds compatibility for both CCI and buildkite during transition
grep -v 'get:secrets' package.json >temp && mv temp package.json

echo ">>> Running all tests (headless mode) ...."

# Define Docker image tag and Docker container name
DOCKER_IMAGE_TAG="${BUILDKITE_BUILD_NUMBER}-${BUILDKITE_COMMIT}"
DOCKER_IMAGE_NAME="cypress-image"

export  BUILDKITE_MESSAGE="" # ignores git messages to prevent multiline issues
printenv >>.env #write all ENV vars into .env file
grep -e '=' .env > temp && cp temp copy_temp && mv temp .env

# Pull Cypress Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_PREFIX}
docker pull $fullImageRepo:${FORMATED_BRANCH_NAME}

# Allow `docker run` step below to fail so we can publish artefacts afterwards
set +o errexit

if [ "${ED_ENV:-}" == "staging" ] ; then
  RUN_COMMAND="yarn test:run:ci --env=staging --branch=${BUILDKITE_BRANCH} --buildkite-parallel-job-count=${BUILDKITE_PARALLEL_JOB_COUNT} --buildkite-parallel-job=${BUILDKITE_PARALLEL_JOB}"
elif [ "${ED_ENV:-}" == "production" ] ; then
  RUN_COMMAND="yarn test:run:ci --env=prod-smoke --branch=${BUILDKITE_BRANCH} --buildkite-parallel-job-count=${BUILDKITE_PARALLEL_JOB_COUNT} --buildkite-parallel-job=${BUILDKITE_PARALLEL_JOB}"
else
  RUN_COMMAND="yarn test:run:ci --env=branch --branch=${BUILDKITE_BRANCH} --buildkite-parallel-job-count=${BUILDKITE_PARALLEL_JOB_COUNT} --buildkite-parallel-job=${BUILDKITE_PARALLEL_JOB}"
fi

rm -rf $(pwd)/videos && mkdir -p $(pwd)/videos
rm -rf $(pwd)/screenshots && mkdir -p $(pwd)/screenshots
rm -rf $(pwd)/logs && mkdir -p $(pwd)/logs
rm -rf $(pwd)/test-report && mkdir -p $(pwd)/test-report

echo "--- Starting Cypress Runner"

## Run Cypress tests into Docker container
docker run -it \
  -v $(pwd)/.env:/e2e/.env \
  --env-file .env \
  -v $(pwd)/videos:/e2e/cypress/videos \
  -v $(pwd)/screenshots:/e2e/cypress/screenshots \
  -v $(pwd)/logs:/e2e/cypress/logs \
  -v $(pwd)/test-report:/e2e/cypress/test-report \
  "${fullImageRepo}:${FORMATED_BRANCH_NAME}" \
  /bin/sh -c "${RUN_COMMAND}"

# Capture the exit code from `docker run` command above
test_exit_status=$?

# Exit as soon as any failure occurs
set -o errexit

# Publish Cypress artefacts (screenshots and videos)
# ./publish-artefacts.sh

# Final exit code from the test that was captured earlier
exit ${test_exit_status}
