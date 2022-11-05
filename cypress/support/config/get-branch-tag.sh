#!/bin/bash
set -euo pipefail
export BRANCH=${BUILDKITE_BRANCH:-${1:-$BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}}
source ./utils-feature-branch.sh
echo "$(generateTag ${BRANCH})"
