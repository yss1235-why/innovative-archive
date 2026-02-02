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
}

export interface CreateOrderData {
    userId: string;
    userEmail: string;
    userName: string;
    items: OrderItem[];
    total: number;
    referralCode?: string | null;
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
}

/**
 * Create a new order in Firestore
 */
export async function createOrder(data: CreateOrderData): Promise<string> {
    try {
        // Get referral code from localStorage if not provided
        const referralCode = data.referralCode ||
            (typeof window !== 'undefined' ? localStorage.getItem("referralCode") : null);

        const orderRef = await addDoc(collection(db, "orders"), {
            userId: data.userId,
            userEmail: data.userEmail,
            userName: data.userName,
            items: data.items,
            total: data.total,
            referralCode: referralCode || null,
            status: "pending",
            createdAt: serverTimestamp(),
        });

        return orderRef.id;
    } catch (error) {
        console.error("Error creating order:", error);
        throw error;
    }
}

/**
 * Process referral commission when order is completed
 * Called when admin marks an order as "completed"
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
            console.log("No referral code on order, skipping commission");
            return;
        }

        // Find the referrer by their referral code
        const { getDocs, query, where } = await import("firebase/firestore");
        const usersQuery = query(
            collection(db, "users"),
            where("referralCode", "==", order.referralCode)
        );
        const usersSnap = await getDocs(usersQuery);

        if (usersSnap.empty) {
            console.log("Referrer not found for code:", order.referralCode);
            return;
        }

        const referrerDoc = usersSnap.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data();

        // Get commission percentage from settings
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        const commissionPercent = settingsDoc.exists()
            ? (settingsDoc.data().commissionPercent || 10)
            : 10;

        // Calculate commission
        const commissionAmount = Math.round((order.total * commissionPercent) / 100);

        // Create referral record
        await addDoc(collection(db, "referrals"), {
            referrerId: referrerId,
            referrerName: referrerData.name || referrerData.email,
            orderId: orderId,
            orderUserId: order.userId,
            orderUserName: order.userName,
            orderTotal: order.total,
            commission: commissionAmount,
            commissionPercent: commissionPercent,
            status: "pending", // pending commission payout
            createdAt: serverTimestamp(),
        });

        // Credit the referrer's wallet
        await updateDoc(doc(db, "users", referrerId), {
            "wallet.balance": increment(commissionAmount),
            "wallet.pendingCommissions": increment(commissionAmount),
            "wallet.lastUpdated": serverTimestamp(),
        });

        // Create pending commission record
        await addDoc(collection(db, "pendingCommissions"), {
            userId: referrerId,
            orderId: orderId,
            commissionAmount: commissionAmount,
            status: "pending",
            createdAt: serverTimestamp(),
        });

        console.log(`Commission of ₹${commissionAmount} credited to referrer ${referrerId}`);
    } catch (error) {
        console.error("Error processing order completion:", error);
        throw error;
    }
}

/**
 * Update order status
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

        // If order is completed, process referral commission
        if (status === "completed") {
            await processOrderCompletion(orderId);
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}
