# Technical Design: Invoice Generator with GST

## Overview

Implement a GST-compliant invoice generation system that:
1. Extends the Product interface with GST rate and HSN code fields
2. Captures buyer state and optional GSTIN at checkout
3. Calculates taxes using reverse calculation (GST inclusive pricing)
4. Generates downloadable PDF invoices
5. Stores invoices in Firestore linked to orders

## Architecture

```mermaid
graph LR
    A[Checkout] --> B[Create Order]
    B --> C[Generate Invoice]
    C --> D[Calculate GST]
    D --> E[Generate PDF]
    E --> F[Store in Firestore]
    F --> G[Return Download URL]
```

## Data Model

### Product (Extended)

```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;              // GST inclusive price
  priceType?: "free" | "subscription";
  imageUrl: string;
  description: string;
  downloadUrl?: string;
  // NEW FIELDS
  gstRate: 0 | 5 | 12 | 18;   // GST percentage
  hsnCode?: string;           // HSN/SAC code
}
```

### Invoice

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;      // IA/FY26/0001
  orderId: string;            // Linked order
  
  // Seller Info
  seller: {
    name: string;
    address: string;
    state: string;
    stateCode: string;
    gstin?: string;           // Placeholder for future
  };
  
  // Buyer Info
  buyer: {
    name: string;
    phone: string;
    address: string;
    state: string;
    stateCode: string;
    gstin?: string;           // Optional for B2B
  };
  
  // Items
  items: InvoiceItem[];
  
  // Tax Summary
  taxSummary: {
    taxableAmount: number;    // Sum of base prices
    cgst: number;             // If intrastate
    sgst: number;             // If intrastate
    igst: number;             // If interstate
    totalTax: number;
  };
  
  // Totals
  subtotal: number;           // Sum of item totals
  deliveryCharges: number;    // Placeholder: 0 for now
  grandTotal: number;
  
  // Metadata
  createdAt: Timestamp;
  pdfUrl?: string;            // Stored PDF URL
  isInterstate: boolean;      // IGST vs CGST+SGST
}

interface InvoiceItem {
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;          // GST inclusive per unit
  basePrice: number;          // Calculated: unitPrice / (1 + gstRate)
  gstRate: number;
  gstAmount: number;          // Per item GST
  totalAmount: number;        // unitPrice * quantity
}
```

### Order (Extended)

```typescript
interface Order {
  // ...existing fields
  
  // NEW FIELDS
  invoiceId?: string;         // Reference to invoice
  buyer?: {
    name: string;
    phone: string;
    address: string;
    state: string;
    gstin?: string;
  };
  referralCode?: string;      // Placeholder: for referral tracking
}
```

## State Codes Reference

```typescript
const STATE_CODES: Record<string, string> = {
  "Manipur": "14",
  "Maharashtra": "27",
  "Karnataka": "29",
  "Delhi": "07",
  // ... other states
};
```

## GST Calculation Logic

### Reverse Calculation (Inclusive Pricing)

```typescript
function calculateGST(inclusivePrice: number, gstRate: number) {
  const divisor = 1 + (gstRate / 100);
  const basePrice = inclusivePrice / divisor;
  const gstAmount = inclusivePrice - basePrice;
  
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
  };
}

// Example: ₹250 @ 5% GST
// basePrice = 250 / 1.05 = 238.10
// gstAmount = 250 - 238.10 = 11.90
```

### Tax Split Logic

```typescript
function splitTax(gstAmount: number, isInterstate: boolean) {
  if (isInterstate) {
    return { cgst: 0, sgst: 0, igst: gstAmount };
  } else {
    const half = gstAmount / 2;
    return {
      cgst: Math.round(half * 100) / 100,
      sgst: Math.round(half * 100) / 100,
      igst: 0
    };
  }
}
```

## Invoice Number Generation

```typescript
function generateInvoiceNumber(): string {
  // Determine Financial Year
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  // FY starts in April (month 3)
  const fyStartYear = month < 3 ? year - 1 : year;
  const fyShort = (fyStartYear + 1).toString().slice(-2);
  
  // Get next sequence number from Firestore counter
  // Format: IA/FY26/0001
  return `IA/FY${fyShort}/${sequential.toString().padStart(4, '0')}`;
}
```

## Implementation Steps

1. **Update Product Schema**
   - Add `gstRate` and `hsnCode` fields to Product interface
   - Update admin product form with GST rate dropdown and HSN input
   - Set default GST rates based on category

2. **Update Cart/Checkout**
   - Add buyer info form (name, phone, address, state)
   - Add optional GSTIN field
   - Save buyer info to localStorage for returning customers

3. **Create Invoice Library** (`src/lib/invoice.ts`)
   - `generateInvoiceNumber()` - Sequential invoice numbering
   - `calculateInvoice()` - GST calculations
   - `createInvoice()` - Store invoice in Firestore

4. **Create PDF Generator** (`src/lib/pdf-generator.ts`)
   - Use `jspdf` library for PDF generation
   - Design professional invoice template
   - Include all required GST fields

5. **Update Order Creation**
   - Capture buyer details from checkout
   - Generate invoice after order creation
   - Link invoice to order

6. **Add Download Invoice Button**
   - Show "Download Invoice" option in order confirmation
   - Admin can download any invoice from order details

## Dependencies

- [x] `jspdf` - PDF generation library
- [x] `jspdf-autotable` - Table support for PDF
- [ ] Firestore counters collection for sequential IDs

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/invoice.ts` | NEW | Invoice generation logic |
| `src/lib/pdf-generator.ts` | NEW | PDF template and generation |
| `src/lib/gst-utils.ts` | NEW | GST calculation utilities |
| `src/lib/state-codes.ts` | NEW | Indian state codes reference |
| `src/app/admin/page.tsx` | MODIFY | Add GST rate + HSN to product form |
| `src/app/cart/page.tsx` | MODIFY | Add buyer info form |
| `src/lib/orders.ts` | MODIFY | Link invoice to order |
| `src/app/products/page.tsx` | MODIFY | Update Product interface |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PDF generation fails on mobile | Use client-side fallback with print dialog |
| Sequential invoice numbering race condition | Use Firestore transactions |
| Large invoices (many items) exceed page | Implement page breaks in PDF |

## Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Server-side PDF (API route) | More reliable | Requires backend hosting | ❌ |
| Client-side PDF (jspdf) | Works with static export | Limited styling | ✅ |
| Third-party invoice API | Professional templates | Monthly cost, dependency | ❌ |
