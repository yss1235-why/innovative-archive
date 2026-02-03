# Feature: Invoice Generator with GST

## Summary

Generate GST-compliant downloadable PDF invoices for orders, with support for inclusive pricing (GST included in product price), HSN codes, and CGST/SGST/IGST calculations based on interstate vs intrastate sales. Invoices are linked to orders and stored in the database.

## User Intent

As a business owner, I want to generate professional GST invoices automatically when orders are placed, so that I can maintain proper tax records and provide customers with valid tax invoices.

## User Stories

```
As a customer,
I want to receive a downloadable PDF invoice for my order,
So that I can have a record of my purchase with tax details.
```

```
As an admin,
I want invoices to be automatically generated and stored,
So that I can access them later for accounting purposes.
```

```
As a business owner,
I want GST to be calculated correctly based on buyer's state,
So that I remain compliant with Indian tax laws.
```

## Business Configuration

| Parameter | Value |
|-----------|-------|
| **Business State** | Manipur (State Code: 14) |
| **Invoice Format** | `IA/FY[YY]/[NNNN]` |
| **Pricing Model** | GST Inclusive (reverse calculation) |
| **GSTIN** | To be added later (placeholder) |

## GST Rates by Category

| Category | HSN Code | GST Rate | Notes |
|----------|----------|----------|-------|
| 3D Printing | 9989 | 18% | Printing services |
| Mugs (Ceramic) | 6912 | 12% | Tableware |
| T-Shirts | 6109 | 5% | Under ₹1000/piece |
| Apps & Platforms | 9984 | 18% | Digital services |

## Tax Calculation Rules

### Inclusive Pricing
- Product prices shown to customers **include GST**
- Reverse calculation: `Base Price = Shown Price ÷ (1 + GST Rate)`

### State-based Tax Split
| Scenario | Tax Applied |
|----------|-------------|
| Buyer in Manipur (same state) | CGST (half rate) + SGST (half rate) |
| Buyer outside Manipur (different state) | IGST (full rate) |

### Example: T-Shirt @ ₹250 (5% GST, same state)
| Line | Amount |
|------|--------|
| Base Price | ₹238.10 |
| CGST (2.5%) | ₹5.95 |
| SGST (2.5%) | ₹5.95 |
| **Total** | **₹250.00** |

## Acceptance Criteria

- [x] Given product has GST rate, when displaying invoice, then calculate tax using reverse calculation
- [x] Given buyer is in same state as seller, when generating invoice, then split tax into CGST + SGST
- [x] Given buyer is in different state, when generating invoice, then apply IGST only
- [x] Given an order is created, when user requests invoice, then generate downloadable PDF
- [x] Given invoice is generated, when stored, then it should be linked to the order
- [ ] Given delivery is selected, when calculating total, then add shipping charges on top

## Invoice Components

| Component | Required | Notes |
|-----------|----------|-------|
| Invoice Number | ✅ | Auto-generated: IA/FY26/0001 |
| Invoice Date | ✅ | Order creation date |
| Seller Details | ✅ | Name, Address, State (Manipur), GSTIN (placeholder) |
| Buyer Details | ✅ | Name, Address, State, Phone |
| Buyer GSTIN | Optional | For B2B sales |
| Product Details | ✅ | Name, HSN, Qty, Unit Price, GST Rate |
| Tax Breakdown | ✅ | Taxable Amount + CGST/SGST or IGST |
| Delivery Charges | 🔲 Placeholder | Future feature |
| Total Amount | ✅ | Sum of all items + delivery |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Product without GST rate | Default to 18% |
| Buyer state not provided | Default to same state (intrastate) |
| Order with mixed GST rates | Calculate each item separately, show grouped totals |
| App (free download) | 0 price, no GST calculation |
| App (subscription) | Apply 18% GST |

## Placeholders for Future Features

### 1. Shipping/Delivery Charges
- Add delivery amount on top of product total
- GST on delivery: 18% (transportation services)
- UI: Checkbox for home delivery option

### 2. Referral Code Validation
- Link each order with referral code
- **Security Rule**: Points can ONLY be credited if valid referral code exists
- Validate referral code before applying commission

## Not Included (Out of Scope)

- Invoice history page (admin can view in orders)
- Email invoice to customer (future enhancement)
- Credit notes / returns
- Multiple seller states
