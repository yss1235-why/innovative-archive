# Deployment Runbook

## Prerequisites
- [ ] Node.js installed
- [ ] npm dependencies installed (`npm install`)
- [ ] Wrangler CLI authenticated (`npx wrangler login`)
- [ ] All code changes committed and tested locally

## Deployment Steps

### 1. Build the Application
```bash
cd archive-app
npm run build
```

This creates a static export in the `out/` directory.

### 2. Verify Build
```bash
# Check the out directory exists
ls out/

# Optionally preview locally
npx serve out
```

### 3. Deploy to Cloudflare Pages

**Option A: Using MCP Tool (Recommended)**
Use the Cloudflare deployer MCP tool with:
- `deployment_type`: main
- `project_name`: innovative-archive
- `dist_dir`: path/to/out
- `domain`: innovarc.uk

**Option B: Manual Wrangler Command**
```bash
npx wrangler pages deploy out --project-name innovative-archive --branch main
```

### 4. Verify Deployment
- [ ] Visit https://innovarc.uk
- [ ] Check https://innovative-archive.pages.dev
- [ ] Verify pages load correctly
- [ ] Test Google Sign-In
- [ ] Check product images load

## Post-Deployment Checklist
- [ ] Verify home page loads
- [ ] Verify products page loads
- [ ] Verify authentication works
- [ ] Check browser console for errors
- [ ] Verify admin access for admin email

## Rollback
If issues are found, see [rollback.md](./rollback.md)

## Troubleshooting

### Build Fails with Turbopack Cache Error
```bash
# Clear the cache and rebuild
rm -rf .next
npm run build
```

### 404 on Routes
Ensure all routes are pre-rendered. Check that Suspense boundaries are in place for useSearchParams.

### Firebase Auth Not Working
1. Check Firebase Console > Authentication > Settings > Authorized domains
2. Add `innovarc.uk` and `innovative-archive.pages.dev` to authorized domains
