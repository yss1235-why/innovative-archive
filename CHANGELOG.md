# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cart functionality
- Order creation flow

---

## [1.0.0] - 2026-02-01

### Added
- **Landing Page**
  - Hero section with tagline "Your ideas, printed locally"
  - About section highlighting 3 founders
  - Product category cards (3D Printing, Mugs, T-Shirts)
  - Founders section with icons
  - Referral CTA with dynamic link generation
  - Inspirational quotes section
  - Footer with address (Ukhrul, Manipur - 795142)

- **Authentication**
  - Google Sign-In via Firebase Auth
  - Auto user profile creation in Firestore
  - Referral code generation for new users
  - Admin role detection for `yursccc@gmail.com`

- **User Dashboard** (`/dashboard`)
  - Orders tab with status display
  - Cart tab (placeholder)
  - Referrals tab with earnings tracking and copy link
  - Profile tab with phone number save

- **Admin Dashboard** (`/admin`)
  - Orders management with status updates
  - Products management (add, delete, upload images)
  - Referrals management (mark as paid)
  - Settings (commission %, WhatsApp number)

- **Products Page** (`/products`)
  - Category filtering
  - Product grid with cards
  - Custom order CTA

- **Infrastructure**
  - Firebase initialization (Auth, Firestore, Storage)
  - Firestore security rules
  - WhatsApp integration utilities
  - Static export for Cloudflare Pages
  - Deployed to innovarc.uk

### Security
- Firestore rules protecting user data
- Admin-only access to sensitive operations
