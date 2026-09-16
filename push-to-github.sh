#!/bin/bash

# ============================================================
#  push-to-github.sh  v2.0
#  Robust GitHub push with error recovery, retry logic,
#  rollback support, and detailed logging.
#  Repository: ethinxsolutionsau-prog/main-rain
# ============================================================

set -euo pipefail

# ── Colours ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Config ───────────────────────────────────────────────────
GITHUB_ORG="ethinxsolutionsau-prog"
GITHUB_REPO="main-rain"
DEFAULT_BRANCH="main"
MAX_RETRIES=3
RETRY_DELAY=5          # seconds between retries
LOG_FILE="push-log-$(date +%Y%m%d-%H%M%S).txt"
ROLLBACK_TAG="pre-push-backup-$(date +%Y%m%d-%H%M%S)"

# ── State tracking ───────────────────────────────────────────
PUSHED_BRANCHES=()
FAILED_BRANCHES=()
SKIPPED_BRANCHES=()
GITHUB_PAT=""
GITHUB_USERNAME=""
AUTHENTICATED_URL=""
ORIGINAL_REMOTE_URL=""
ROLLBACK_AVAILABLE=false

# ── Logging ──────────────────────────────────────────────────
log() {
  local LEVEL="$1"; shift
  local MSG="$*"
  local TIMESTAMP
  TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$TIMESTAMP] [$LEVEL] $MSG" >> "$LOG_FILE"
}

log_and_print() {
  local COLOR="$1"; shift
  local SYMBOL="$1"; shift
  local MSG="$*"
  echo -e "${COLOR}${SYMBOL}${NC} ${MSG}"
  log "INFO" "$(echo -e "$MSG" | sed 's/\x1b\[[0-9;]*m//g')"
}

info()    { log_and_print "$BLUE"    "ℹ" "$*"; }
success() { log_and_print "$GREEN"   "✓" "$*"; }
warn()    { log_and_print "$YELLOW"  "⚠" "$*"; }
error()   { log_and_print "$RED"     "✗" "$*"; }
step()    { echo -e "\n${CYAN}${BOLD}── $* ${NC}"; log "STEP" "$*"; }

# ── Cleanup / Rollback on unexpected exit ────────────────────
cleanup() {
  local EXIT_CODE=$?
  echo "" >> "$LOG_FILE"
  log "INFO" "Script exiting with code $EXIT_CODE"

  # Always sanitise the remote URL (remove PAT)
  if [ -n "$AUTHENTICATED_URL" ] && git remote get-url origin &>/dev/null; then
    git remote set-url origin "https://github.com/${GITHUB_ORG}/${GITHUB_REPO}.git" 2>/dev/null || true
    log "INFO" "Remote URL sanitised (PAT removed)"
  fi

  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}${BOLD}Script exited unexpectedly (code $EXIT_CODE).${NC}"
    echo -e "  Log file: ${CYAN}${LOG_FILE}${NC}"

    if [ "$ROLLBACK_AVAILABLE" = true ]; then
      echo ""
      echo -e "${YELLOW}A rollback tag was created before the push: ${BOLD}${ROLLBACK_TAG}${NC}"
      echo -e "  To restore your local repo to that state:"
      echo -e "  ${DIM}git checkout ${ROLLBACK_TAG}${NC}"
    fi

    print_summary
  fi
}
trap cleanup EXIT

# ── Banner ───────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║     Second Brain → GitHub Push  (v2.0 — Robust Edition)     ║${NC}"
  echo -e "${CYAN}${BOLD}║     Target : ${GITHUB_ORG}/${GITHUB_REPO}              ║${NC}"
  echo -e "${CYAN}${BOLD}║     Log    : ${LOG_FILE}                  ║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log "INFO" "=== push-to-github.sh v2.0 started ==="
  log "INFO" "Target: https://github.com/${GITHUB_ORG}/${GITHUB_REPO}"
}

# ── Summary report ───────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  PUSH SUMMARY${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ ${#PUSHED_BRANCHES[@]} -gt 0 ]; then
    echo -e "  ${GREEN}${BOLD}Succeeded (${#PUSHED_BRANCHES[@]}):${NC}"
    for b in "${PUSHED_BRANCHES[@]}"; do
      echo -e "    ${GREEN}✓${NC}  $b"
      log "SUMMARY" "PUSHED: $b"
    done
  fi

  if [ ${#SKIPPED_BRANCHES[@]} -gt 0 ]; then
    echo -e "  ${YELLOW}${BOLD}Skipped / Up-to-date (${#SKIPPED_BRANCHES[@]}):${NC}"
    for b in "${SKIPPED_BRANCHES[@]}"; do
      echo -e "    ${YELLOW}–${NC}  $b"
      log "SUMMARY" "SKIPPED: $b"
    done
  fi

  if [ ${#FAILED_BRANCHES[@]} -gt 0 ]; then
    echo -e "  ${RED}${BOLD}Failed (${#FAILED_BRANCHES[@]}):${NC}"
    for b in "${FAILED_BRANCHES[@]}"; do
      echo -e "    ${RED}✗${NC}  $b"
      log "SUMMARY" "FAILED: $b"
    done
    echo ""
    echo -e "  ${YELLOW}To retry failed branches manually:${NC}"
    for b in "${FAILED_BRANCHES[@]}"; do
      echo -e "  ${DIM}git push origin ${b}${NC}"
    done
  fi

  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  Full log: ${CYAN}${LOG_FILE}${NC}"
  echo ""
}

# ── Push a single branch with retry logic ────────────────────
push_branch_with_retry() {
  local BRANCH="$1"
  local IS_PRIMARY="${2:-false}"
  local ATTEMPT=0
  local PUSH_FLAGS="-u"

  [ "$IS_PRIMARY" = true ] && PUSH_FLAGS="-u --force-with-lease"

  echo -e "\n  ${BOLD}Branch:${NC} ${BRANCH}"
  log "INFO" "Pushing branch: $BRANCH (primary=$IS_PRIMARY)"

  while [ $ATTEMPT -lt $MAX_RETRIES ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -ne "    Attempt ${ATTEMPT}/${MAX_RETRIES}... "

    # Capture both stdout and stderr
    PUSH_OUTPUT=$(git push $PUSH_FLAGS origin "$BRANCH" 2>&1) || PUSH_EXIT=$?
    PUSH_EXIT=${PUSH_EXIT:-0}

    if [ $PUSH_EXIT -eq 0 ]; then
      echo -e "${GREEN}✓ pushed${NC}"
      log "INFO" "Branch '$BRANCH' pushed successfully on attempt $ATTEMPT"
      PUSHED_BRANCHES+=("$BRANCH")
      return 0
    fi

    log "WARN" "Push attempt $ATTEMPT failed for '$BRANCH': $PUSH_OUTPUT"

    # ── Classify the error ───────────────────────────────────
    if echo "$PUSH_OUTPUT" | grep -q "rejected.*non-fast-forward\|fetch first"; then
      echo -e "${YELLOW}⚠ Remote has diverged${NC}"
      echo ""
      echo -e "    ${YELLOW}Remote branch '${BRANCH}' has commits not in your local branch.${NC}"
      echo -e "    Options:"
      echo -e "      ${BOLD}[f]${NC} Force push (overwrites remote — use with caution)"
      echo -e "      ${BOLD}[m]${NC} Merge remote changes first (safe)"
      echo -e "      ${BOLD}[s]${NC} Skip this branch"
      echo -n "    Choose [f/m/s]: "
      read -r DIVERGE_CHOICE

      case "$DIVERGE_CHOICE" in
        f|F)
          warn "Force pushing '$BRANCH' (overwriting remote)..."
          log "WARN" "User chose force push for '$BRANCH'"
          if git push --force origin "$BRANCH" 2>&1; then
            success "Force push succeeded for '$BRANCH'"
            log "INFO" "Force push succeeded for '$BRANCH'"
            PUSHED_BRANCHES+=("$BRANCH (force)")
            return 0
          else
            error "Force push also failed for '$BRANCH'"
            log "ERROR" "Force push failed for '$BRANCH'"
            FAILED_BRANCHES+=("$BRANCH")
            return 1
          fi
          ;;
        m|M)
          info "Pulling remote changes for '$BRANCH'..."
          log "INFO" "User chose merge for '$BRANCH'"
          if git pull origin "$BRANCH" --no-rebase 2>&1; then
            success "Merge succeeded — retrying push..."
            continue  # retry the push loop
          else
            error "Merge failed for '$BRANCH'. Resolve conflicts manually."
            log "ERROR" "Merge failed for '$BRANCH'"
            FAILED_BRANCHES+=("$BRANCH")
            return 1
          fi
          ;;
        s|S|*)
          warn "Skipping branch '$BRANCH'"
          log "INFO" "User skipped '$BRANCH'"
          SKIPPED_BRANCHES+=("$BRANCH (diverged — skipped by user)")
          return 0
          ;;
      esac

    elif echo "$PUSH_OUTPUT" | grep -q "Everything up-to-date"; then
      echo -e "${YELLOW}– already up to date${NC}"
      log "INFO" "Branch '$BRANCH' already up to date"
      SKIPPED_BRANCHES+=("$BRANCH (already up to date)")
      return 0

    elif echo "$PUSH_OUTPUT" | grep -q "Authentication failed\|could not read Username\|403\|401"; then
      echo -e "${RED}✗ authentication error${NC}"
      error "Authentication failed for '$BRANCH'. Check your PAT."
      log "ERROR" "Auth failure on '$BRANCH': $PUSH_OUTPUT"
      FAILED_BRANCHES+=("$BRANCH")
      return 1  # No point retrying auth failures

    elif echo "$PUSH_OUTPUT" | grep -q "Repository not found\|404"; then
      echo -e "${RED}✗ repository not found${NC}"
      error "Repository not found. Check org/repo name and PAT permissions."
      log "ERROR" "Repo not found: $PUSH_OUTPUT"
      FAILED_BRANCHES+=("$BRANCH")
      return 1

    elif echo "$PUSH_OUTPUT" | grep -q "timeout\|timed out\|Could not resolve\|network"; then
      echo -e "${YELLOW}⚠ network error — will retry${NC}"
      log "WARN" "Network error on attempt $ATTEMPT for '$BRANCH'"
      if [ $ATTEMPT -lt $MAX_RETRIES ]; then
        echo -e "    Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
      fi
      continue

    else
      echo -e "${RED}✗ unknown error${NC}"
      echo -e "    ${DIM}${PUSH_OUTPUT}${NC}"
      log "ERROR" "Unknown push error on attempt $ATTEMPT for '$BRANCH': $PUSH_OUTPUT"
      if [ $ATTEMPT -lt $MAX_RETRIES ]; then
        echo -e "    Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
      fi
      continue
    fi
  done

  # All retries exhausted
  error "All ${MAX_RETRIES} attempts failed for branch '${BRANCH}'"
  log "ERROR" "All retries exhausted for '$BRANCH'"
  FAILED_BRANCHES+=("$BRANCH")

  echo ""
  echo -e "  ${YELLOW}What would you like to do?${NC}"
  echo -e "    ${BOLD}[r]${NC} Retry this branch one more time"
  echo -e "    ${BOLD}[s]${NC} Skip and continue with other branches"
  echo -e "    ${BOLD}[a]${NC} Abort entire push"
  echo -n "  Choose [r/s/a]: "
  read -r RETRY_CHOICE

  case "$RETRY_CHOICE" in
    r|R)
      info "Retrying '$BRANCH' one more time..."
      log "INFO" "User requested manual retry for '$BRANCH'"
      FAILED_BRANCHES=("${FAILED_BRANCHES[@]/$BRANCH/}")  # remove from failed
      if git push -u origin "$BRANCH" 2>&1; then
        success "Manual retry succeeded for '$BRANCH'"
        PUSHED_BRANCHES+=("$BRANCH")
        return 0
      else
        error "Manual retry also failed for '$BRANCH'"
        FAILED_BRANCHES+=("$BRANCH")
        return 1
      fi
      ;;
    a|A)
      error "Aborting push at user request."
      log "INFO" "User aborted push after failure on '$BRANCH'"
      exit 1
      ;;
    s|S|*)
      warn "Skipping '$BRANCH' and continuing..."
      log "INFO" "User skipped '$BRANCH' after all retries"
      return 0
      ;;
  esac
}

# ════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════

print_banner

# ── Step 1: Prerequisites ────────────────────────────────────
step "1/8  Checking prerequisites"

for CMD in git curl; do
  if ! command -v "$CMD" &>/dev/null; then
    error "$CMD is not installed. Please install it and try again."
    exit 1
  fi
done
success "git $(git --version | awk '{print $3}') and curl found"

# ── Step 2: Confirm project directory ───────────────────────
step "2/8  Confirming project directory"
info "Current directory: $(pwd)"

MISSING_FILES=()
for F in package.json server.js; do
  [ ! -f "$F" ] && MISSING_FILES+=("$F")
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  warn "Expected files not found: ${MISSING_FILES[*]}"
  echo -n "  Continue anyway? (y/N): "
  read -r CONT
  [[ ! "$CONT" =~ ^[Yy]$ ]] && { error "Aborted."; exit 1; }
else
  success "Project root confirmed"
fi

# ── Step 3: Collect credentials ─────────────────────────────
step "3/8  GitHub Authentication"
echo ""
echo -e "  ${BOLD}Need a PAT?${NC} Create one at:"
echo -e "  ${CYAN}https://github.com/settings/tokens/new${NC}"
echo -e "  Required scope: ${BOLD}repo${NC}"
echo ""

read -rp "  GitHub username: " GITHUB_USERNAME
[ -z "$GITHUB_USERNAME" ] && { error "Username cannot be empty."; exit 1; }

echo -n "  Personal Access Token (hidden): "
read -rs GITHUB_PAT
echo ""
[ -z "$GITHUB_PAT" ] && { error "PAT cannot be empty."; exit 1; }

log "INFO" "Credentials collected for user: $GITHUB_USERNAME"

# ── Step 4: Validate PAT ─────────────────────────────────────
step "4/8  Validating PAT against GitHub API"

API_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}")

HTTP_BODY=$(echo "$API_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$API_RESPONSE" | tail -n 1)

log "INFO" "GitHub API response status: $HTTP_STATUS"

case "$HTTP_STATUS" in
  200) success "PAT validated — repository access confirmed" ;;
  401) error "Authentication failed (401). PAT is invalid or expired."; exit 1 ;;
  403) error "Forbidden (403). PAT may lack 'repo' scope or org SSO access."; exit 1 ;;
  404) error "Repository not found (404): ${GITHUB_ORG}/${GITHUB_REPO}"; exit 1 ;;
  *)   warn "Unexpected HTTP status: $HTTP_STATUS — proceeding with caution" ;;
esac

# Check rate limit remaining
RATE_REMAINING=$(echo "$HTTP_BODY" | grep -o '"X-RateLimit-Remaining":"[0-9]*"' | grep -o '[0-9]*' || echo "unknown")
log "INFO" "API rate limit remaining: $RATE_REMAINING"

# ── Step 5: Git identity ─────────────────────────────────────
step "5/8  Configuring git identity"

GIT_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [ -z "$GIT_NAME" ]; then
  read -rp "  Name for git commits: " GIT_NAME
  git config --global user.name "$GIT_NAME"
fi
if [ -z "$GIT_EMAIL" ]; then
  read -rp "  Email for git commits: " GIT_EMAIL
  git config --global user.email "$GIT_EMAIL"
fi

success "Git identity: ${GIT_NAME} <${GIT_EMAIL}>"
log "INFO" "Git identity: $GIT_NAME <$GIT_EMAIL>"

# ── Step 6: Initialise repo, create rollback tag ─────────────
step "6/8  Preparing repository"

if [ ! -d ".git" ]; then
  info "Initialising git repository..."
  git init
  success "Git repository initialised"
else
  success "Existing git repository detected"

  # Save rollback tag BEFORE any changes
  git tag "$ROLLBACK_TAG" 2>/dev/null && {
    ROLLBACK_AVAILABLE=true
    success "Rollback tag created: ${ROLLBACK_TAG}"
    log "INFO" "Rollback tag: $ROLLBACK_TAG"
  } || warn "Could not create rollback tag (no commits yet — that's OK)"
fi

# Save original remote URL for rollback
ORIGINAL_REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
log "INFO" "Original remote URL: $ORIGINAL_REMOTE_URL"

# Set authenticated remote
AUTHENTICATED_URL="https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/${GITHUB_ORG}/${GITHUB_REPO}.git"

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$AUTHENTICATED_URL"
  info "Remote 'origin' updated"
else
  git remote add origin "$AUTHENTICATED_URL"
  info "Remote 'origin' added"
fi

# Rename to main
git branch -M "$DEFAULT_BRANCH" 2>/dev/null || true

# Stage and commit
info "Staging all files..."
git add .

if git diff --cached --quiet; then
  warn "Nothing new to commit — working tree is clean"
else
  FILE_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
  success "${FILE_COUNT} file(s) staged"

  git commit -m "feat: complete Second Brain dashboard with ETHINX agent system

- Built full-stack Second Brain app (Node.js + React)
- Implemented JWT authentication with email registration/login
- Created responsive React frontend with dark/light mode support
- Added 10 ETHINX agents with proper GitHub structure
- Built comprehensive Agent Control UI (AgentRegistry, AgentContext,
  AgentList, AgentDetail, PermissionsPanel, ActivityLog)
- Implemented agent registry with permissions and activity tracking
- Added agent management interface for external data access control
- Created deployment configs (Docker, Vercel, Railway, Netlify)
- Included complete documentation and setup scripts
- Added reusable workflow for future second brain deployments" 2>&1

  success "Commit created"
  log "INFO" "Commit created with $FILE_COUNT files"
fi

# ── Step 7: Push all branches ────────────────────────────────
step "7/8  Pushing branches to GitHub"

# Collect all local branches
ALL_BRANCHES=$(git branch --format='%(refname:short)' 2>/dev/null || echo "$DEFAULT_BRANCH")
BRANCH_COUNT=$(echo "$ALL_BRANCHES" | wc -l | tr -d ' ')
info "Found ${BRANCH_COUNT} local branch(es) to push"
log "INFO" "Branches to push: $(echo "$ALL_BRANCHES" | tr '\n' ' ')"

# Push primary branch first
push_branch_with_retry "$DEFAULT_BRANCH" true

# Push remaining branches
while IFS= read -r BRANCH; do
  [ "$BRANCH" = "$DEFAULT_BRANCH" ] && continue
  [ -z "$BRANCH" ] && continue
  push_branch_with_retry "$BRANCH" false
done <<< "$ALL_BRANCHES"

# ── Step 8: Retry failed branches ───────────────────────────
step "8/8  Post-push review"

if [ ${#FAILED_BRANCHES[@]} -gt 0 ]; then
  echo ""
  warn "${#FAILED_BRANCHES[@]} branch(es) failed to push:"
  for b in "${FAILED_BRANCHES[@]}"; do
    echo -e "    ${RED}✗${NC}  $b"
  done

  echo ""
  echo -n "  Retry all failed branches now? (y/N): "
  read -r RETRY_ALL

  if [[ "$RETRY_ALL" =~ ^[Yy]$ ]]; then
    STILL_FAILED=()
    for BRANCH in "${FAILED_BRANCHES[@]}"; do
      [ -z "$BRANCH" ] && continue
      echo -e "\n  ${BOLD}Retrying:${NC} $BRANCH"
      log "INFO" "Batch retry for '$BRANCH'"
      if git push -u origin "$BRANCH" 2>&1; then
        success "Retry succeeded for '$BRANCH'"
        PUSHED_BRANCHES+=("$BRANCH (retry)")
        log "INFO" "Retry succeeded for '$BRANCH'"
      else
        error "Retry failed for '$BRANCH'"
        STILL_FAILED+=("$BRANCH")
        log "ERROR" "Retry failed for '$BRANCH'"
      fi
    done
    FAILED_BRANCHES=("${STILL_FAILED[@]}")
  fi
fi

# ── Security: Remove PAT from remote ────────────────────────
git remote set-url origin "https://github.com/${GITHUB_ORG}/${GITHUB_REPO}.git"
success "Remote URL sanitised (PAT removed)"
log "INFO" "Remote URL sanitised"

# ── Final summary ────────────────────────────────────────────
print_summary

# ── Final status ─────────────────────────────────────────────
if [ ${#FAILED_BRANCHES[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║                  ✅  ALL PUSHES COMPLETE!                    ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}Repository:${NC} ${CYAN}https://github.com/${GITHUB_ORG}/${GITHUB_REPO}${NC}"
  echo -e "  ${BOLD}Branch:${NC}     ${DEFAULT_BRANCH}"
  echo ""
  echo -e "  ${BOLD}Next steps:${NC}"
  echo -e "  1. Visit your repo to confirm all files are present"
  echo -e "  2. Configure environment variables for deployment"
  echo -e "  3. Deploy via Railway, Vercel, or Docker"
  echo -e "  4. See ${BOLD}DEPLOYMENT.md${NC} for full deployment instructions"
  echo ""
  log "INFO" "=== All pushes completed successfully ==="
  exit 0
else
  echo -e "${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}${BOLD}║          ⚠  PUSH COMPLETED WITH SOME FAILURES               ║${NC}"
  echo -e "${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}${#PUSHED_BRANCHES[@]}${NC} branch(es) pushed, ${RED}${BOLD}${#FAILED_BRANCHES[@]}${NC} failed."
  echo -e "  Review ${CYAN}${LOG_FILE}${NC} for details."
  echo ""
  if [ "$ROLLBACK_AVAILABLE" = true ]; then
    echo -e "  ${YELLOW}To roll back your local repo to pre-push state:${NC}"
    echo -e "  ${DIM}git checkout ${ROLLBACK_TAG}${NC}"
    echo ""
  fi
  log "INFO" "=== Push completed with ${#FAILED_BRANCHES[@]} failure(s) ==="
  exit 1
fi