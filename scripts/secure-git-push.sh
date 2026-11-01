#!/usr/bin/env bash
# ==============================================================================
# SECURE DEPLOYMENT GATEKEEPER & GIT PUSH PIPELINE
# ==============================================================================
# Strict deployment gatekeeper script for Curation Kitchen.
# Enforces environment validation, secret presence, TypeScript type safety,
# and production build integrity before allowing any commit or push to GitHub main.
# ==============================================================================

set -eo pipefail

# ANSI Color codes for readable console feedback
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${BLUE}   CURATION KITCHEN :: PRODUCTION DEPLOYMENT GATEKEEPER        ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}\n"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ROOT_DIR}/.env"

# ------------------------------------------------------------------------------
# STEP 1: LOAD ENVIRONMENT CONFIGURATION
# ------------------------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}[CONFIG]${NC} Sourcing environment variables from ${ENV_FILE}..."
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Clean whitespace and surrounding quotes
    key=$(echo "$key" | tr -d '[:space:]')
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    # Only export if not already defined in shell environment to respect overrides
    if [ -z "${!key:-}" ]; then
      export "$key=$value"
    fi
  done < "$ENV_FILE"
else
  echo -e "${YELLOW}[CONFIG WARNING]${NC} Local .env file not found at ${ENV_FILE}. Relying on exported environment variables."
fi

# ------------------------------------------------------------------------------
# GATE 1: STRICT NODE_ENV VALIDATION
# ------------------------------------------------------------------------------
echo -e "${BLUE}[GATE 1/4]${NC} Validating NODE_ENV environment setting..."
if [ -z "${NODE_ENV:-}" ]; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] NODE_ENV is not set!${NC}"
  echo -e "${RED}Deployment blocked: You must specify a valid NODE_ENV (e.g., 'production' or 'development') in .env or shell environment.${NC}\n"
  exit 1
fi
echo -e "${GREEN}  ✓ NODE_ENV is set to '${NODE_ENV}'${NC}"

# ------------------------------------------------------------------------------
# GATE 2: STRICT GEMINI_API_KEY VALIDATION
# ------------------------------------------------------------------------------
echo -e "${BLUE}[GATE 2/4]${NC} Validating GEMINI_API_KEY engine dependency..."
if [ -z "${GEMINI_API_KEY:-}" ] || \
   [ "${GEMINI_API_KEY}" = "MY_GEMINI_API_KEY" ] || \
   [ "${GEMINI_API_KEY}" = "PASTE_YOUR_GEMINI_API_KEY_HERE" ] || \
   [ "${GEMINI_API_KEY}" = "YOUR_GEMINI_API_KEY" ]; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] GEMINI_API_KEY is missing or unconfigured!${NC}"
  echo -e "${RED}Deployment blocked: The AI Auto-Plan recipe engine and OCR/UPC parser require an active GEMINI_API_KEY.${NC}"
  echo -e "${RED}Please configure GEMINI_API_KEY in your .env file or deployment secret store.${NC}\n"
  exit 1
fi
echo -e "${GREEN}  ✓ GEMINI_API_KEY is present and configured.${NC}"

# ------------------------------------------------------------------------------
# GATE 3: TYPE SAFETY VERIFICATION (tsc --noEmit)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[GATE 3/4]${NC} Running TypeScript type-safety check (tsc --noEmit)..."
if ! npx tsc --noEmit; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] TypeScript type checking failed!${NC}"
  echo -e "${RED}Deployment blocked: Resolve all TypeScript compilation errors before attempting to push to main.${NC}\n"
  exit 1
fi
echo -e "${GREEN}  ✓ TypeScript validation passed with zero type errors.${NC}"

# ------------------------------------------------------------------------------
# GATE 4: PRODUCTION BUILD INTEGRITY (npm run build)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[GATE 4/4]${NC} Verifying full production bundle compilation (npm run build)..."
if ! npm run build; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] Production build failed!${NC}"
  echo -e "${RED}Deployment blocked: Vite client bundle or Express server build failed.${NC}\n"
  exit 1
fi
echo -e "${GREEN}  ✓ Production build completed successfully.${NC}"

# ------------------------------------------------------------------------------
# REPOSITORY & CREDENTIAL VALIDATION
# ------------------------------------------------------------------------------
REPO="${GITHUB_REPO_URL:-}"
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "PASTE_YOUR_COPIED_TOKEN_HERE" ]; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] GITHUB_TOKEN has not been configured in .env.${NC}"
  echo -e "${RED}Please edit .env and replace 'PASTE_YOUR_COPIED_TOKEN_HERE' with your personal access token.${NC}\n"
  exit 1
fi

if [ -z "$REPO" ]; then
  echo -e "\n${RED}${BOLD}[FATAL GATEKEEPER ERROR] GITHUB_REPO_URL is missing.${NC}\n"
  exit 1
fi

# Sanitize target repository URL (strip leading protocol and trailing slash if present)
CLEAN_URL=$(echo "$REPO" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/*$||')

# Construct authenticated URL
AUTH_URL="https://x-access-token:${TOKEN}@${CLEAN_URL}"

# ------------------------------------------------------------------------------
# OPTIONAL COMMIT HANDLING
# ------------------------------------------------------------------------------
# If a commit message is provided as the first argument, commit any staged/working files
COMMIT_MSG="${1:-}"
if [ -n "$COMMIT_MSG" ]; then
  echo -e "${BLUE}[GIT]${NC} Commit message argument detected: '${COMMIT_MSG}'"
  git add -A
  if git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}[GIT]${NC} Working tree clean, nothing new to commit."
  else
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}  ✓ Committed changes with message: \"${COMMIT_MSG}\"${NC}"
  fi
fi

# ------------------------------------------------------------------------------
# GIT REMOTE CONFIGURATION & PUSH
# ------------------------------------------------------------------------------
echo -e "${BLUE}[GIT]${NC} Re-linking git remote origin..."
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$AUTH_URL"
else
  git remote add origin "$AUTH_URL"
fi

CURRENT_BRANCH=$(git branch --show-current || echo "")
if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${BLUE}[GIT]${NC} Ensuring local branch is 'main'..."
  git checkout -B main
fi

echo -e "${BLUE}[GIT]${NC} Pushing hardened commits to remote origin (branch: main)..."
if ! git push -u origin main; then
  echo -e "\n${RED}${BOLD}[FATAL DEPLOYMENT ERROR] Failed to push to remote repository!${NC}"
  echo -e "${RED}Check network connectivity, token permissions, or upstream branch status.${NC}\n"
  exit 1
fi

echo -e "\n${BOLD}${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}   DEPLOYMENT SUCCESSFUL :: MAIN BRANCH SYNCED TO GITHUB        ${NC}"
echo -e "${BOLD}${GREEN}================================================================${NC}\n"

exit 0
