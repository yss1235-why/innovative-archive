# Features

This directory contains feature specifications.

## Structure

Each feature gets its own subdirectory:
```
02-features/
├── _template/          # Copy this for new features
├── authentication/     # Google Sign-In
├── referral-system/    # Referral & commissions
├── product-catalog/    # Product listing
└── admin-dashboard/    # Admin management
```

## Creating a New Feature

Use the workflow: `/add-feature <feature-name>`

Or manually:
1. Copy `_template/` to `<feature-name>/`
2. Fill in each document
3. Update this README with the new feature

## Current Features

| Feature | Status | Owner | Last Updated |
|---------|--------|-------|--------------|
| Authentication | 🟢 Complete | - | 2026-02-01 |
| Referral System | 🟢 Complete | - | 2026-02-01 |
| Product Catalog | 🟢 Complete | - | 2026-02-01 |
| User Dashboard | 🟢 Complete | - | 2026-02-01 |
| Admin Dashboard | 🟢 Complete | - | 2026-02-01 |
| Cart & Checkout | 🟡 In Progress | - | - |
| Invoice Generator | 🔴 Not Started | - | 2026-02-03 |

## Feature Descriptions

### Authentication
Google Sign-In with automatic user profile creation, admin role detection, and referral code assignment.

### Referral System
Users get unique referral codes, can share links, and earn commission when referred friends make first purchases.

### Product Catalog
Products displayed by category (3D Print, Mugs, T-Shirts), fetched from Firestore, with admin upload capability.

### User Dashboard
Tabs for viewing orders, cart, referral earnings, and profile management (phone number for payouts).

### Admin Dashboard
Manage orders (status updates), products (add/delete), referrals (mark paid), and settings (commission %, WhatsApp number).
