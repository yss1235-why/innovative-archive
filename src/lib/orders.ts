"use client";

import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    imageUrl?: string;
    gstRate?: number;   // GST percentage
    hsnCode?: string;   // HSN/SAC code
}

export interface CreateOrderData {
    userId: string;
    userEmail: string;
    userName: string;
    items: OrderItem[];
    total: number;
    referralCode?: string | null;
    buyer?: {
        name: string;
        phone: string;
        address: string;
        state: string;
        gstin?: string;
    };
}

export interface Order {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    items: OrderItem[];
    total: number;
    referralCode?: string | null;
    status: "pending" | "processing" | "shipped" | "completed" | "cancelled";
    createdAt: Date;
    invoiceId?: string;  // Reference to draft/generated invoice
    buyer?: {
        name: string;
        phone: string;
        address: string;
        state: string;
        gstin?: string;
    };
}

/**
 * Create a new order in Firestore
 * Gets referrer info from Firestore user.referredBy instead of localStorage
 */
export async function createOrder(data: CreateOrderData): Promise<string> {
    try {
        // Get referral code from Firestore user document (not localStorage)
        let referralCode = data.referralCode || null;

        if (!referralCode) {
            // Check if user has a referrer set in Firestore
            const userDoc = await getDoc(doc(db, "users", data.userId));
            if (userDoc.exists() && userDoc.data().referredBy) {
                // User has a referrer - get the referrer's referral code
                const referrerId = userDoc.data().referredBy;
                const referrerDoc = await getDoc(doc(db, "users", referrerId));
                if (referrerDoc.exists() && referrerDoc.data().referralCode) {
                    referralCode = referrerDoc.data().referralCode;
                }
            }
        }

        const orderRef = await addDoc(collection(db, "orders"), {
            userId: data.userId,
            userEmail: data.userEmail,
            userName: data.userName,
            items: data.items,
            total: data.total,
            referralCode: referralCode || null,
            status: "pending",
            invoiceId: `inv_${Date.now()}`, // Will be replaced with actual invoice ID
            buyer: data.buyer || null,
            createdAt: serverTimestamp(),
        });

        // Clear pending referral from localStorage after successful order
        if (typeof window !== 'undefined') {
            localStorage.removeItem("pendingReferral");
            localStorage.removeItem("pendingReferralTime");
        }

        return orderRef.id;
    } catch (error) {
        console.error("Error creating order:", error);
        throw error;
    }
}

/**
 * Process referral commission when order is completed
 * Called when admin marks an order as "completed"
 * Respects admin settings: commissionEnabled, maxCommissionPurchases, commissionRate
 */
export async function processOrderCompletion(orderId: string): Promise<void> {
    try {
        // Get the order
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (!orderDoc.exists()) {
            throw new Error("Order not found");
        }

        const order = orderDoc.data();

        // Check if order has a referral code
        if (!order.referralCode) {
            return;
        }

        // Get settings
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};

        // Check if commission system is enabled
        const commissionEnabled = settings.commissionEnabled !== false; // Default true
        if (!commissionEnabled) {
            return;
        }

        // Get commission rate and max purchases settings
        const commissionRate = settings.commissionRate || 10;
        const maxCommissionPurchases = settings.maxCommissionPurchases ?? 1; // Default to 1 (first purchase only)

        // Find the referrer by their referral code
        const { getDocs, query, where } = await import("firebase/firestore");
        const usersQuery = query(
            collection(db, "users"),
            where("referralCode", "==", order.referralCode)
        );
        const usersSnap = await getDocs(usersQuery);

        if (usersSnap.empty) {
            return;
        }

        const referrerDoc = usersSnap.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data();

        // Check if this user has already earned max commissions for their referrer
        if (maxCommissionPurchases > 0) {
            const orderUserDoc = await getDoc(doc(db, "users", order.userId));
            const commissionsEarnedCount = orderUserDoc.exists()
                ? (orderUserDoc.data().commissionsEarnedCount || 0)
                : 0;

            if (commissionsEarnedCount >= maxCommissionPurchases) {
                return;
            }
        }

        // Calculate commission
        const commissionAmount = Math.round((order.total * commissionRate) / 100);

        // Create referral record
        await addDoc(collection(db, "referrals"), {
            referrerId: referrerId,
            referrerName: referrerData.name || referrerData.displayName || referrerData.email,
            orderId: orderId,
            orderUserId: order.userId,
            orderUserName: order.userName,
            orderTotal: order.total,
            commission: commissionAmount,
            commissionRate: commissionRate,
            status: "pending", // pending commission payout
            createdAt: serverTimestamp(),
        });

        // Credit the referrer's wallet (using consistent field naming)
        const newBalance = (referrerData.wallet_balance || 0) + commissionAmount;
        await updateDoc(doc(db, "users", referrerId), {
            wallet_balance: increment(commissionAmount),
            wallet_on_hold: increment(commissionAmount),
            wallet_lastUpdated: serverTimestamp(),
        });

        // Log the transaction for user's history
        await addDoc(collection(db, "transactionLogs"), {
            userId: referrerId,
            type: "commission_credit",
            amount: commissionAmount,
            balanceAfter: newBalance,
            description: `Commission from order #${orderId.slice(-6).toUpperCase()}`,
            createdAt: serverTimestamp(),
        });

        // Increment commissionsEarnedCount on the referred user
        await updateDoc(doc(db, "users", order.userId), {
            commissionsEarnedCount: increment(1),
        });

        // Create pending commission record
        await addDoc(collection(db, "pendingCommissions"), {
            userId: referrerId,
            orderId: orderId,
            commissionAmount: commissionAmount,
            commissionRate: commissionRate,
            status: "pending",
            createdAt: serverTimestamp(),
        });

        // Commission successfully processed
    } catch (error) {
        console.error("Error processing order completion:", error);
        throw error;
    }
}

/**
 * Update order status
 * Finalizes invoice when status changes to shipped or completed
 */
export async function updateOrderStatus(
    orderId: string,
    status: Order["status"]
): Promise<void> {
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status: status,
            updatedAt: serverTimestamp(),
        });

        // If order is shipped or completed, finalize the invoice (generate invoice number)
        if (status === "shipped" || status === "completed") {
            try {
                const { finalizeInvoice } = await import("./invoice");
                const invoiceId = `inv_${orderId}`;
                await finalizeInvoice(invoiceId);
                // Invoice finalized successfully
            } catch (invoiceError) {
                // Don't fail the status update if invoice finalization fails
                console.error("Error finalizing invoice:", invoiceError);
            }
        }

        // If order is completed, process referral commission
        if (status === "completed") {
            await processOrderCompletion(orderId);
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}
