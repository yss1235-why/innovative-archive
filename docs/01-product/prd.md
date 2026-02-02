# Product Requirements Document

## Overview
Innovative Archive is a web platform for a local printing business based in Ukhrul, Manipur. It enables customers to browse and order custom printed products (3D prints, mugs, t-shirts) via WhatsApp, with a built-in referral system.

## Problem Statement
Local creators and gift buyers in Ukhrul lack an easy way to order custom printed products. Existing solutions require complex checkout flows or aren't locally available.

## Target Users
| Persona | Description | Primary Need |
|---------|-------------|--------------|
| Local Creator | Artists wanting custom merch | Easy customization, quality |
| Gift Buyer | People wanting personalized gifts | Quick ordering |
| Small Business | Startups needing branded items | Bulk orders, consistency |
| Referrer | Users earning commissions | Simple referrals, clear payouts |

## Core Requirements (Must Have)
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| R1 | Landing page with product showcase | P0 | ✅ |
| R2 | Google Sign-In authentication | P0 | ✅ |
| R3 | Product catalog with categories | P0 | ✅ |
| R4 | User dashboard (orders, referrals, profile) | P0 | ✅ |
| R5 | Admin dashboard (orders, products, referrals, settings) | P0 | ✅ |
| R6 | Referral link generation | P0 | ✅ |
| R7 | WhatsApp-based checkout | P0 | ⬜ Partial |
| R8 | Cart functionality | P1 | ⬜ |

## Nice-to-Have (Future)
| ID | Requirement | Priority |
|----|-------------|----------|
| R10 | 3D product configurator | P2 |
| R11 | Online payment integration | P2 |
| R12 | Order notifications (SMS/Email) | P2 |
| R13 | Product reviews | P3 |
| R14 | Bulk order discounts | P2 |

## Constraints
- **Technical**: Static export for Cloudflare Pages (no SSR)
- **Business**: WhatsApp-based checkout (no online payments initially)
- **Timeline**: MVP launched Feb 2026

## Success Criteria
- [x] Users can sign in with Google
- [x] Users can view products by category
- [x] Users get unique referral codes
- [x] Admins can manage products and orders
- [ ] Users can add items to cart and checkout via WhatsApp

## Out of Scope
- Online payment processing
- Inventory management
- Shipping integration
- Multi-language support
