#!/bin/bash
set -euo pipefail

function main() {
  cat "e2e-tests/buildkite/templates/pipeline-header.yml" > generated_config.yml
  if [ "${ED_ENV}" == "dev" ]; then
    cat "e2e-tests/buildkite/templates/pipeline-run-tests-dev.yml" >> generated_config.yml
  else
    cat "e2e-tests/buildkite/templates/pipeline-build-e2e.yml" >> generated_config.yml
    cat "e2e-tests/buildkite/templates/pipeline-run-tests.yml" >> generated_config.yml
  fi
}

echo "--- Assembling Pipeline"
main

echo "~~~ Displaying Pipeline"
echo "${ED_ENV}"
cat generated_config.yml

echo "+++ Uploading Pipeline"
cat generated_config.yml | buildkite-agent pipeline upload
