# API Documentation

## Overview
Innovative Archive uses Firebase Firestore as its backend database. All data access is done directly from the client using the Firebase SDK with security rules enforcing access control.

## Base Configuration
Firebase is initialized in `src/lib/firebase.ts` with the following services:
- **Auth**: Google Sign-In authentication
- **Firestore**: NoSQL document database
- **Storage**: File storage for product images

## Collections Reference

### Users Collection
**Path**: `users/{userId}`

| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Auth UID |
| email | string | User's email |
| displayName | string | User's display name |
| phone | string? | Phone number (for payouts) |
| role | "user" \| "admin" | User role |
| referralCode | string | Unique 8-char referral code |
| referredBy | string? | Code of referring user |
| createdAt | Timestamp | Account creation time |

**Access Rules**:
- Read/Write: Owner or Admin

---

### Products Collection
**Path**: `products/{productId}`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated ID |
| name | string | Product name |
| category | "3d-print" \| "mug" \| "tshirt" | Category |
| price | number | Price in INR |
| imageUrl | string | Firebase Storage URL |
| description | string | Product description |
| createdAt | Timestamp | Creation time |

**Access Rules**:
- Read: Public
- Write: Admin only

---

### Orders Collection
**Path**: `orders/{orderId}`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated ID |
| userId | string | Customer's UID |
| items | Array | Order items |
| items[].name | string | Product name |
| items[].price | number | Unit price |
| items[].quantity | number | Quantity |
| total | number | Order total |
| status | "pending" \| "processing" \| "delivered" | Order status |
| createdAt | Timestamp | Order time |

**Access Rules**:
- Read: Owner or Admin
- Create: Owner (userId must match)
- Update/Delete: Admin only

---

### Referrals Collection
**Path**: `referrals/{referralId}`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated ID |
| referrerId | string | UID of referring user |
| refereeId | string | UID of referred user |
| commission | number | Commission amount |
| status | "pending" \| "paid" | Payout status |
| createdAt | Timestamp | Creation time |

**Access Rules**:
- Read: Owner (referrerId) or Admin
- Create: Authenticated users
- Update/Delete: Admin only

---

### Settings Collection
**Path**: `settings/general`

| Field | Type | Description |
|-------|------|-------------|
| commissionPercent | number | Referral commission % |
| whatsappNumber | string | WhatsApp number for orders |

**Access Rules**:
- Read: Public
- Write: Admin only

---

## Client-Side Data Access Patterns

### Fetching Products
```typescript
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// All products
const snapshot = await getDocs(collection(db, "products"));

// By category
const q = query(
  collection(db, "products"),
  where("category", "==", "mug")
);
const snapshot = await getDocs(q);
```

### Creating a User Profile
```typescript
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

await setDoc(doc(db, "users", userId), {
  uid: userId,
  email: user.email,
  displayName: user.displayName,
  role: "user",
  referralCode: generateReferralCode(),
  createdAt: serverTimestamp(),
});
```

### Updating Order Status (Admin)
```typescript
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

await updateDoc(doc(db, "orders", orderId), {
  status: "processing",
});
```

### Getting Settings
```typescript
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const settingsDoc = await getDoc(doc(db, "settings", "general"));
const settings = settingsDoc.data();
```

## WhatsApp Integration

### Generate Order Link
```typescript
import { generateWhatsAppLink } from "@/lib/whatsapp";

const link = await generateWhatsAppLink(
  "Custom Mug",
  299,
  "Blue with name 'John'"
);
// Returns: https://wa.me/91XXXXXXXXXX?text=...
```

## Error Handling

All Firestore operations should be wrapped in try-catch:
```typescript
try {
  const docRef = await addDoc(collection(db, "orders"), orderData);
  console.log("Order created:", docRef.id);
} catch (error) {
  console.error("Error creating order:", error);
  throw error;
}
```
