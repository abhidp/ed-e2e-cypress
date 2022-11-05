#!/bin/bash

function exportUrlVariables(){
  local -r TAG="$1"
  local -r DOMAIN_NAME="staging.edapp.com"
  local -r INTERNAL_DOMAIN_NAME="internal.staging.edapp.com"

  export HIPPO_API_URL="hippo-$TAG.$DOMAIN_NAME"
  export EMILY_API_URL="api-$TAG.$DOMAIN_NAME"
  export ROMEO_URL="website-$TAG.$DOMAIN_NAME"
  export EMILY_CMS_URL="cms-$TAG.$DOMAIN_NAME"
  export ED_WEB_URL="web-$TAG.$DOMAIN_NAME"
  export PUBLIC_API_PROXY_URL="rest-$TAG.$DOMAIN_NAME"
  export FJORD_URL="fjord-$TAG.$DOMAIN_NAME"
  export UNIFIED_URL="unified-experience-$TAG.$INTERNAL_DOMAIN_NAME"
}

function replaceValueInKust() {
    local -r key="$1"
    local -r value="$2"
    local -r file="${3:-./kustomization.yaml}"
    sed -i.bak  "s%{${key}}%${value}%" "${file}" \
      && rm "${file}.bak"
}

function dns_probe(){
  local DOMAIN="$1"
  local dns_answer=""
  local nb_attempts=0
  local max_attempts=15
  while [ -z  "$dns_answer" ]
  do
    # we have a max attempt to prevent from getting endlessly stuck.
    if [ "$nb_attempts" -gt "$max_attempts" ]
    then
      echo "dns probe failed for $DOMAIN"
      return
    else
      echo "dns probe attempt number $nb_attempts for $DOMAIN"
      time_to_sleep=$((60 * $nb_attempts))
      sleep $time_to_sleep
      dns_answer="$(dig +short $DOMAIN A)"
      echo "$dns_answer"
      # we increment the wait between each attempt to avoid getting stuck with endless dns poisonning
      # the minimum wait is 60secs * number of attempt
      nb_attempts=$(($nb_attempts + 1))
    fi
  done
  echo "Dns for $DOMAIN ready"
}


function check_alb_rollout(){
  local TAG="$1"
  local READY=0
  while [ $READY == 0 ]
  do
    echo "Checking rollout for ALB"
    READY=$((kubectl get ingress -n $TAG | grep "elb.amazonaws.com" || true)  | wc -l)
    sleep 5
  done
  echo "ALB rolled out"
}

function generateTag(){
  local -r BRANCH="$1"
  local TAG="master"

  if [ $BRANCH == "master" ]
  then
   TAG="master"
  elif [[ $BRANCH == *rc ]]
  then
   TAG=$(sed -e "s/\./-/g" <<< $BRANCH)
  else
    if [[ $BRANCH == *"/"* ]]
    then
      TAG="$(cut -d'/' -f2 <<<"$BRANCH")"
    else
      TAG="$BRANCH"
    fi
    TAG=$(sed -e "s/\./-/g" <<< $TAG)
    TAG=$(echo $TAG | sed -e "s/_/-/g" )
    TAG="$(cut -d'-' -f1 <<<"$TAG")"-"$(cut -d'-' -f2 <<<"$TAG")"
  fi
  TAG="$(tr [A-Z] [a-z] <<< "$TAG")"
  echo $TAG
}

function getFormattedBranch(){
  local -r BRANCH="$1"
  echo $BRANCH | sed 's/[\/\\]/-/g'
}


function post_to_slack(){
  echo "Post to slack $1"
  if [ ! -z "$SLACK_HOOK_URL" ]
  then
    echo "SLACK_HOOK_URL: $SLACK_HOOK_URL"
    DATA='{"text":"'"$1"'"}'
    echo $DATA

    res=$(curl -X POST -H 'Content-type: application/json' --data "$DATA" $SLACK_HOOK_URL)
    if [[ "$(echo ${res} | jq '.ok')" == "false" ]]; then
      echo "Error sending Slack notification: $(echo ${res} | jq -r '.error')."
    else
      echo "Sent Slack notification"
    fi
  fi
}

function copy_secrets_from_staging() {
  echo copy_secrets_from_staging
  local -r TAG="$1"
  kubectl get secrets --namespace=staging -o yaml | sed "s/namespace: staging/namespace: $TAG/g" | kubectl create -f -
}

function replaceNamepaceForFeatureBranch() {
    local -r tag="$2"
    local -r kustomizationDirectory="$1"

    sed -i.bak  "s/namespace: feature-branch$/namespace: ${tag}/" "${kustomizationDirectory}kustomization.yaml" \
      && rm "${kustomizationDirectory}kustomization.yaml.bak"
    
    # "{PR_NAMESPACE_PLACEHOLDER}" makes the intent clearer than "feature-branch" and can also be used for purposes
    # other than the namespace (e.g. DynamoDB table name prefix).
    sed -i "s/{PR_NAMESPACE_PLACEHOLDER}/${tag}/" "${kustomizationDirectory}kustomization.yaml"
}

function replaceNameForRedisFeatureBranch() {
    local -r REDIS_NAME="$2"
    local -r KUSTOMIZATION_DIRECTORY="$1"

    for CONFIG_FILE in ${KUSTOMIZATION_DIRECTORY}redis*.yaml; do
      local TEMPLATE_FILE="$CONFIG_FILE.template"
      [ -f "$TEMPLATE_FILE" ] || cp "$CONFIG_FILE" "$TEMPLATE_FILE"
      sed "s/REDIS_NAME/redis-${REDIS_NAME}/" "$TEMPLATE_FILE" > "$CONFIG_FILE" \
        && cat $CONFIG_FILE
    done
}
