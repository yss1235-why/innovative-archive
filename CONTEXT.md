# Project Context

> **Quick context for AI assistants and new developers**

## What is this?
Innovative Archive - A local printing business platform for 3D printing, custom mugs, and t-shirts. Features a referral/commission system and WhatsApp-based checkout.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Deployment | Cloudflare Pages |
| Domain | innovarc.uk |

## Project Structure
```
archive-app/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx         # Landing page
│   │   ├── products/        # Products listing
│   │   ├── dashboard/       # User dashboard
│   │   └── admin/           # Admin panel
│   ├── components/
│   │   ├── ui/              # GlassCard, Navbar
│   │   └── auth/            # LoginButton, UserMenu
│   └── lib/
│       ├── firebase.ts      # Firebase init
│       ├── auth.ts          # Google auth functions
│       ├── AuthContext.tsx  # Auth provider
│       └── whatsapp.ts      # WhatsApp utilities
├── public/                  # Static assets
├── docs/                    # Documentation
└── firestore.rules          # Database security rules
```

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase configuration & initialization |
| `src/lib/auth.ts` | Google Sign-In, user profile creation |
| `src/lib/AuthContext.tsx` | Global auth state provider |
| `src/app/admin/page.tsx` | Admin dashboard for orders, products, referrals |
| `firestore.rules` | Firestore security rules |

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (static export) |
| `npm run lint` | Run ESLint |

## Environment Variables
| Variable | Description |
|----------|-------------|
| *Hardcoded in firebase.ts* | Firebase config (move to env for production) |

## Current Status
- [x] MVP complete
- [x] Deployed to production (innovarc.uk)
- [ ] Cart functionality (pending)
- [ ] Order creation flow (pending)

## What's Being Worked On
- Setting up comprehensive project documentation

## Admin Access
- Email: `yursccc@gmail.com`
- Role is set automatically on first login

## Firebase Collections
| Collection | Purpose |
|------------|---------|
| `users` | User profiles, referral codes, phone numbers |
| `products` | Product catalog (name, price, image, category) |
| `orders` | Customer orders with status tracking |
| `referrals` | Referral commissions and payout status |
| `settings` | App settings (commission %, WhatsApp number) |

---
*Last updated: 2026-02-02*
