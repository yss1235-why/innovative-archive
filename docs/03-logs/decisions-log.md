# Architecture Decision Records (ADRs)

## Log of Important Decisions

## ADR-001: Static Export for Cloudflare Pages

**Date**: 2026-02-01
**Status**: Accepted

### Context
Need to deploy Next.js app to Cloudflare Pages. Cloudflare Pages has excellent edge performance but requires static or compatible builds.

### Decision
Use Next.js static export (`output: 'export'`) in `next.config.ts`. All pages are pre-rendered at build time.

### Consequences
- ✅ Fast global edge delivery via Cloudflare CDN
- ✅ Simple deployment (just upload `out/` folder)
- ✅ No server costs
- ⚠️ No SSR or API routes (use Firebase directly from client)
- ⚠️ Need Suspense boundaries for useSearchParams()

---

## ADR-002: WhatsApp-Based Checkout

**Date**: 2026-02-01
**Status**: Accepted

### Context
Online payment integration is complex and has fees. Target users are local and prefer personal communication.

### Decision
Use WhatsApp "click-to-chat" links for checkout. Order details are formatted as a message. Admin receives orders via WhatsApp and processes manually.

### Consequences
- ✅ Zero payment processing fees
- ✅ Personal touch for local business
- ✅ No payment gateway integration needed
- ⚠️ Manual order processing by admin
- ⚠️ No automatic order creation in database

---

## ADR-003: Firebase for Backend Services

**Date**: 2026-02-01
**Status**: Accepted

### Context
Need authentication, database, and file storage. Small team, need to move fast.

### Decision
Use Firebase for all backend:
- Auth: Google Sign-In
- Database: Firestore (NoSQL)
- Storage: Firebase Storage for product images

### Consequences
- ✅ Quick setup, generous free tier
- ✅ Real-time sync capabilities
- ✅ Built-in security rules
- ⚠️ Vendor lock-in
- ⚠️ Costs scale with usage

---

## ADR-004: Tailwind CSS v4 for Styling

**Date**: 2026-02-01
**Status**: Accepted

### Context
Need consistent styling with dark/glass aesthetic. Want utility-first for rapid development.

### Decision
Use Tailwind CSS v4 with custom dark theme (stone-950 base, glass effects via backdrop-blur).

### Consequences
- ✅ Rapid styling with utilities
- ✅ Consistent design system
- ✅ Small final bundle (purged CSS)
- ⚠️ Learning curve for team

---

## ADR-005: Single Hardcoded Admin Email

**Date**: 2026-02-01
**Status**: Accepted

### Context
MVP needs admin access but multi-admin setup is complex for initial launch.

### Decision
Hardcode admin email (`yursccc@gmail.com`) in auth logic. Check in both client (AuthContext) and Firestore rules.

### Consequences
- ✅ Simple implementation
- ✅ Secure (only specific email gets access)
- ⚠️ Need code change to add more admins
- ⚠️ Should migrate to role-based system later

---
