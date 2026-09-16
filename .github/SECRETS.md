# 🔐 GitHub Actions Secrets Setup Guide

This document explains every secret required by the CI/CD pipeline and how to configure them securely.

---

## Required Secrets

### `GH_PAT` — GitHub Personal Access Token *(required)*

Used by all workflows to authenticate pushes, create rollback tags, and access the repository.

**How to create:**
1. Go to → https://github.com/settings/tokens/new
2. Set **Note**: `second-brain-cicd`
3. Set **Expiration**: 90 days (rotate regularly)
4. Select scopes:
   - ✅ `repo` — Full control of private repositories
   - ✅ `workflow` — Update GitHub Actions workflows
5. Click **Generate token** → copy immediately

**How to add:**
1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GH_PAT`
4. Value: paste your token
5. Click **Add secret**

---

### `RAILWAY_TOKEN` — Railway Deployment Token *(optional)*

Used by the deploy job to push to Railway. If not set, the deploy step is skipped gracefully.

**How to create:**
1. Log in at → https://railway.app
2. Go to **Account Settings** → **Tokens**
3. Click **New Token** → name it `github-actions`
4. Copy the token

**How to add:**
- Name: `RAILWAY_TOKEN`
- Value: your Railway token

---

### `SLACK_WEBHOOK` — Slack Notification Webhook *(optional)*

Used by the notify job to post push results to a Slack channel. If not set, Slack notifications are silently skipped.

**How to create:**
1. Go to → https://api.slack.com/apps → **Create New App**
2. Choose **From scratch** → name it `Second Brain CI`
3. Go to **Incoming Webhooks** → toggle **On**
4. Click **Add New Webhook to Workspace** → select channel
5. Copy the webhook URL

**How to add:**
- Name: `SLACK_WEBHOOK`
- Value: `https://hooks.slack.com/services/T.../B.../...`

---

## Secrets Summary Table

| Secret | Required | Used By | Purpose |
|--------|----------|---------|---------|
| `GH_PAT` | ✅ Yes | All workflows | Authenticate git push + tag creation |
| `RAILWAY_TOKEN` | ⚪ Optional | `push-and-deploy.yml` | Deploy to Railway |
| `SLACK_WEBHOOK` | ⚪ Optional | `push-and-deploy.yml` | Slack notifications |

---

## Environment Protection Rules (Recommended)

For the `production` environment (used by deploy + rollback jobs):

1. Go to repo → **Settings** → **Environments** → **New environment**
2. Name: `production`
3. Enable **Required reviewers** → add yourself or your team
4. Enable **Wait timer**: 5 minutes (gives time to cancel accidental deploys)
5. Restrict to branch: `main` only

---

## Secret Rotation Policy

| Secret | Recommended Rotation |
|--------|---------------------|
| `GH_PAT` | Every 90 days |
| `RAILWAY_TOKEN` | Every 180 days |
| `SLACK_WEBHOOK` | Only if compromised |

**To rotate `GH_PAT`:**
1. Generate a new token at GitHub Settings
2. Update the `GH_PAT` secret in repo Settings
3. Delete the old token at GitHub Settings → Tokens
4. Verify the next pipeline run succeeds

---

## Troubleshooting

### Push fails with "Authentication failed"
- Check `GH_PAT` is set correctly (no extra spaces)
- Verify the token has `repo` scope
- Check the token hasn't expired
- For org repos: ensure SSO is authorised for the token

### Deploy job is skipped
- Check `RAILWAY_TOKEN` is set
- Verify the push was to `main` branch
- Check `deploy_after_push` input is `true`

### Rollback workflow fails
- Ensure the tag name is exact (copy from push log artifact)
- Type `CONFIRM` exactly in the confirm field
- Verify `GH_PAT` has write access to the branch