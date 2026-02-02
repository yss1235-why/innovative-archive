# Rollback Runbook

## When to Rollback
- Critical functionality broken (auth, products not loading)
- Error rate significantly increased
- User reports of major issues

## Rollback Options

### Option 1: Redeploy Previous Build

Cloudflare Pages keeps deployment history. You can rollback via the Cloudflare dashboard:

1. Go to https://dash.cloudflare.com
2. Navigate to Pages > innovative-archive
3. Go to "Deployments" tab
4. Find the previous working deployment
5. Click the three dots menu > "Rollback to this deployment"

### Option 2: Git Revert and Redeploy

```bash
# Find the commit to revert to
git log --oneline -10

# Revert to that commit
git revert <commit-hash>

# Push the revert
git push origin main

# Rebuild and redeploy
npm run build
# Use deployer tool or wrangler
```

### Option 3: Manual Redeploy from Local

If you have a previous working build locally:
```bash
npx wrangler pages deploy out --project-name innovative-archive
```

## Post-Rollback Actions

- [ ] Verify site is functioning
- [ ] Document what went wrong in docs/03-logs/implementation-log.md
- [ ] Create a bug report
- [ ] Investigate root cause before next deployment

## Emergency Contacts

- Primary Admin: yursccc@gmail.com

## Incident Template

When logging a rollback incident:

```markdown
### Incident: [DATE] - [Brief Title]

**Severity**: High / Medium / Low
**Duration**: [Time of incident to resolution]

**What Happened**:
- Description of the issue

**Impact**:
- What users were affected
- What functionality was broken

**Root Cause**:
- What caused the issue

**Resolution**:
- How it was fixed

**Prevention**:
- How to prevent this in future
```
