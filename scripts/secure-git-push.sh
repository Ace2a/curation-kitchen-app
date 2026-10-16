#!/usr/bin/env bash
set -e

# ==============================================================================
# SECURE AUTOMATED GIT DEPLOYMENT SCRIPT
# ==============================================================================
# Reads GITHUB_REPO_URL and GITHUB_TOKEN from the local .env file,
# re-links git remote origin with authenticated credentials,
# and pushes the main branch to GitHub.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Local .env file not found at ${ENV_FILE}"
  exit 1
fi

# Load variables from .env cleanly
while IFS='=' read -r key value || [ -n "$key" ]; do
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$key" ]] && continue
  key=$(echo "$key" | tr -d '[:space:]')
  value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  export "$key=$value"
done < "$ENV_FILE"

REPO="${GITHUB_REPO_URL:-}"
TOKEN="${GITHUB_TOKEN:-}"

# Validation Checks
if [ -z "$TOKEN" ] || [ "$TOKEN" = "PASTE_YOUR_COPIED_TOKEN_HERE" ]; then
  echo "Error: GITHUB_TOKEN has not been configured in .env."
  echo "Please edit .env and replace 'PASTE_YOUR_COPIED_TOKEN_HERE' with your personal access token."
  exit 1
fi

if [ -z "$REPO" ]; then
  echo "Error: GITHUB_REPO_URL is missing in .env."
  exit 1
fi

# Sanitize target repository URL (strip leading protocol and trailing slash if present)
CLEAN_URL=$(echo "$REPO" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/*$||')

# Construct authenticated URL (supports both classic and fine-grained PATs)
AUTH_URL="https://x-access-token:${TOKEN}@${CLEAN_URL}"

echo "Re-linking git remote origin..."
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$AUTH_URL"
else
  git remote add origin "$AUTH_URL"
fi

echo "Current local branch:"
git branch --show-current || git checkout -B main

echo "Pushing local commits to remote origin (branch: main)..."
git push -u origin main

echo "Deployment complete! Local main branch pushed successfully."
