#!/usr/bin/env bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null || true)
fi

REPO="${GITHUB_REPO_URL:-}"
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$REPO" ]; then
  echo "Error: GITHUB_REPO_URL is not defined in your .env file."
  echo "Example: GITHUB_REPO_URL=\"https://github.com/<username>/<repo-name>.git\""
  exit 1
fi

# Extract host and path
CLEAN_URL=$(echo "$REPO" | sed -e 's|^https://||' -e 's|^http://||')

if [ -n "$TOKEN" ]; then
  AUTH_URL="https://${TOKEN}@${CLEAN_URL}"
  echo "Pushing cleanly to GitHub using secure token from .env..."
  git push "$AUTH_URL" main
  echo "Successfully pushed to ${REPO} on branch main!"
else
  echo "Error: GITHUB_TOKEN is not defined in your .env file."
  echo "Example: GITHUB_TOKEN=\"ghp_...\""
  exit 1
fi
