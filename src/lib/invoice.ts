"use client";

/**
 * Invoice Generation Library
 * 
 * Handles invoice creation, storage, and retrieval.
 * Uses hybrid approach: save invoice data on order, generate number on ship/complete.
 */

import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    runTransaction,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import {
    calculateGSTFromInclusive,
    splitGST,
    getDefaultGSTRate,
    getDefaultHSNCode,
    type GSTRate,
} from "./gst-utils";
import { SELLER_STATE, getStateCode, isInterstate } from "./state-codes";

// ============================================
// Types
// ============================================

export interface SellerInfo {
    name: string;
    address: string;
    state: string;
    stateCode: string;
    gstin?: string;
}

export interface BuyerInfo {
    name: string;
    phone: string;
    address: string;
    state: string;
    stateCode: string;
    gstin?: string;
}

export interface InvoiceItem {
    name: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;       // GST inclusive per unit
    basePrice: number;       // Calculated: unitPrice / (1 + gstRate)
    gstRate: number;
    gstAmount: number;       // Per item GST
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;     // unitPrice * quantity
}

export interface TaxSummary {
    taxableAmount: number;   // Sum of base prices
    cgst: number;            // If intrastate
    sgst: number;            // If intrastate
    igst: number;            // If interstate
    totalTax: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string | null;  // null until generated
    orderId: string;

    seller: SellerInfo;
    buyer: BuyerInfo;

    items: InvoiceItem[];
    taxSummary: TaxSummary;

    subtotal: number;
    deliveryCharges: number;    // Placeholder: 0 for now
    grandTotal: number;

    createdAt: Timestamp;
    invoiceGeneratedAt?: Timestamp;
    isInterstate: boolean;
    status: "draft" | "generated";  // draft = no invoice number yet
}

export interface OrderItemForInvoice {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    gstRate?: number;
    hsnCode?: string;
}

// ============================================
// Seller Info (Configured for Innovative Archive)
// ============================================

const SELLER_INFO: SellerInfo = {
    name: "Innovative Archive",
    address: "Imphal, Manipur, India",
    state: SELLER_STATE.name,
    stateCode: SELLER_STATE.code,
    gstin: undefined, // To be added when registered
};

// ============================================
// Invoice Number Generation
// ============================================

/**
 * Generate next invoice number using Firestore transaction
 * Format: IA/FY26/0001
 */
export async function generateInvoiceNumber(): Promise<string> {
    const counterRef = doc(db, "counters", "invoices");

    const invoiceNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        // Determine current financial year
        const now = new Date();
        const month = now.getMonth(); // 0-11
        const year = now.getFullYear();

        // FY starts in April (month 3)
        const fyStartYear = month < 3 ? year - 1 : year;
        const fyKey = `FY${(fyStartYear + 1).toString().slice(-2)}`; // e.g., FY26

        let nextNumber = 1;

        if (counterDoc.exists()) {
            const data = counterDoc.data();
            const currentFY = data.currentFY;

            if (currentFY === fyKey) {
                // Same FY, increment
                nextNumber = (data.lastNumber || 0) + 1;
            } else {
                // New FY, reset to 1
                nextNumber = 1;
            }
        }

        // Update counter
        transaction.set(counterRef, {
            currentFY: fyKey,
            lastNumber: nextNumber,
            updatedAt: serverTimestamp(),
        });

        // Format: IA/FY26/0001
        return `IA/${fyKey}/${nextNumber.toString().padStart(4, "0")}`;
    });

    return invoiceNumber;
}

// ============================================
// Invoice Creation (Draft - on order creation)
// ============================================

/**
 * Create a draft invoice when an order is placed
 * Invoice number is NOT generated yet - that happens on ship/complete
 */
export async function createDraftInvoice(
    orderId: string,
    items: OrderItemForInvoice[],
    buyer: BuyerInfo,
    deliveryCharges: number = 0
): Promise<string> {
    const invoiceId = `inv_${orderId}`;
    const interstate = isInterstate(buyer.state);

    // Calculate items with GST
    const invoiceItems: InvoiceItem[] = items.map((item) => {
        const gstRate = item.gstRate ?? getDefaultGSTRate(item.category || "");
        const hsnCode = item.hsnCode || getDefaultHSNCode(item.category || "");
        const totalPrice = item.price * item.quantity;

        const { basePrice, gstAmount } = calculateGSTFromInclusive(totalPrice, gstRate);
        const { cgst, sgst, igst } = splitGST(gstAmount, interstate);

        return {
            name: item.name,
            hsnCode,
            quantity: item.quantity,
            unitPrice: item.price,
            basePrice,
            gstRate,
            gstAmount,
            cgst,
            sgst,
            igst,
            totalAmount: totalPrice,
        };
    });

    // Calculate totals
    const taxSummary: TaxSummary = invoiceItems.reduce(
        (acc, item) => ({
            taxableAmount: acc.taxableAmount + item.basePrice,
            cgst: acc.cgst + item.cgst,
            sgst: acc.sgst + item.sgst,
            igst: acc.igst + item.igst,
            totalTax: acc.totalTax + item.gstAmount,
        }),
        { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
    );

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const grandTotal = subtotal + deliveryCharges;

    // Create invoice document
    const invoice: Omit<Invoice, "id"> = {
        invoiceNumber: null, // Will be generated later
        orderId,
        seller: SELLER_INFO,
        buyer: {
            ...buyer,
            stateCode: getStateCode(buyer.state) || buyer.stateCode,
        },
        items: invoiceItems,
        taxSummary,
        subtotal,
        deliveryCharges,
        grandTotal,
        createdAt: serverTimestamp() as Timestamp,
        isInterstate: interstate,
        status: "draft",
    };

    await setDoc(doc(db, "invoices", invoiceId), invoice);

    return invoiceId;
}

// ============================================
// Invoice Generation (on ship/complete)
// ============================================

/**
 * Generate invoice number and finalize invoice
 * Called when order status changes to shipped or completed
 */
export async function finalizeInvoice(invoiceId: string): Promise<string> {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
        throw new Error("Invoice not found");
    }

    const invoice = invoiceDoc.data() as Invoice;

    // If already generated, return existing number
    if (invoice.invoiceNumber) {
        return invoice.invoiceNumber;
    }

    // Generate new invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Update invoice
    await updateDoc(invoiceRef, {
        invoiceNumber,
        invoiceGeneratedAt: serverTimestamp(),
        status: "generated",
    });

    return invoiceNumber;
}

// ============================================
// Invoice Retrieval
// ============================================

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
    const invoiceDoc = await getDoc(doc(db, "invoices", invoiceId));

    if (!invoiceDoc.exists()) {
        return null;
    }

    return {
        id: invoiceDoc.id,
        ...invoiceDoc.data(),
    } as Invoice;
}

/**
 * Get invoice by order ID
 */
export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
    const invoiceId = `inv_${orderId}`;
    return getInvoice(invoiceId);
}
