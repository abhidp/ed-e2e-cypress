#!/bin/bash

set -euo pipefail

GIT_COMMIT="$(git rev-parse HEAD)"
ECR_PREFIX="457923578311.dkr.ecr.us-east-1.amazonaws.com"
BRANCH="${BUILDKITE_BRANCH:-${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}}"
FORMATED_BRANCH_NAME="$(echo "${BRANCH}" | sed 's/[\/\\]/-/g')"

# This adds compatibility for both CCI and buildkite during transition
grep -v 'get:secrets' package.json > temp && mv temp package.json
sed -i 's|//\sciBuildId|ciBuildId|g' ./cypress/support/config/cypress.run.js

function buildAndTagImage() {
  local -r dockerfile="$1"
  local -r image="$2"

  local -r fullImageRepo="${ECR_PREFIX}/${image}"

  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_PREFIX}
  docker pull $fullImageRepo:$FORMATED_BRANCH_NAME || true

  echo "## Build image ${image} from ${dockerfile} with tag: ${GIT_COMMIT}"
  DOCKER_BUILDKIT=1 \
  docker build \
    --progress=plain \
    -t "${fullImageRepo}:${FORMATED_BRANCH_NAME}" \
    -f "${dockerfile}" \
    --cache-from $fullImageRepo:$FORMATED_BRANCH_NAME \
    .

  echo "## Upload image to ECR with branch and commit tags"
  docker push "${fullImageRepo}:${FORMATED_BRANCH_NAME}"

}

function main() {
  buildAndTagImage "Dockerfile" "e2e"
}

main
