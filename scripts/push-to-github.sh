#!/usr/bin/env bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  # Read variables while trimming and ignoring comments/blank lines
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key=$(echo "$key" | tr -d '[:space:]')
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    export "$key=$value"
  done < .env
fi

ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "https://github.com")
REPO="${GITHUB_REPO_URL:-$ORIGIN_URL}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

echo "Target Repository: ${REPO}"

if [ -z "$TOKEN" ]; then
  echo "Notice: No GITHUB_TOKEN or GH_TOKEN detected in environment or .env file."
  echo "Attempting git push with credential cache / system credentials..."
  git push origin main
  exit 0
fi

# Extract host and path
CLEAN_URL=$(echo "$REPO" | sed -e 's|^https://||' -e 's|^http://||')
AUTH_URL="https://${TOKEN}@${CLEAN_URL}"

echo "Pushing cleanly to GitHub using secure token from environment..."
git push "$AUTH_URL" main
echo "Successfully pushed to ${REPO} on branch main!"
