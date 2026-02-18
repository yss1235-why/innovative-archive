# Tech Debt Log

## Performance

- [ ] **Critical**: Fix `backgroundImage` usage in `src/app/page.tsx` causing LCP of 10s. (Added: 2026-02-18)
- [ ] **Critical**: Remove `unoptimized: true` from `next.config.ts` and configure proper image loader (Cloudinary). (Added: 2026-02-18)
- [ ] **Cleanup**: Investigate and remove unused `SpotlightScene` component to reduce bundle size. (Added: 2026-02-18)
