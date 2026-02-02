# Deployment

## Deployment Documentation

### Environments
| Environment | URL | Branch | Auto-Deploy |
|-------------|-----|--------|-------------|
| Development | localhost:3000 | - | - |
| Production | https://innovarc.uk | main | No |
| Pages Dev | https://innovative-archive.pages.dev | main | No |

### Deployment Process

This is a static Next.js app deployed to Cloudflare Pages.

1. Build the static export: `npm run build`
2. Deploy the `out/` folder to Cloudflare Pages
3. Custom domain `innovarc.uk` is configured

### Environment Variables

Firebase config is currently hardcoded in `src/lib/firebase.ts`.

For production, consider moving to environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Yes | Firebase API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Yes | Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Yes | Firebase project ID |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Yes | Storage bucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Yes | Messaging sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | Yes | Firebase app ID |

### Runbooks
- [deploy.md](./deploy.md) - How to deploy
- [rollback.md](./rollback.md) - How to rollback

### Infrastructure
- **Hosting**: Cloudflare Pages
- **CDN**: Cloudflare (global edge network)
- **DNS**: Cloudflare (innovarc.uk)
- **SSL**: Cloudflare (automatic HTTPS)
