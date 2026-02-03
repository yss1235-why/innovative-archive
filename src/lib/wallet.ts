import { db } from "./firebase";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
} from "firebase/firestore";

// Get referral settings
export interface ReferralSettings {
    commissionRate: number;
    minWithdrawal: number;
    maxWalletUsagePercent: number;
    withdrawalCooldownDays: number;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        if (settingsDoc.exists()) {
            return settingsDoc.data() as ReferralSettings;
        }
    } catch (error) {
        console.error("Error getting referral settings:", error);
    }

    // Default settings (aligned with admin defaults)
    return {
        commissionRate: 10,           // 10% matches admin default
        minWithdrawal: 100,           // ₹100 matches admin default
        maxWalletUsagePercent: 40,    // 40% matches admin default
        withdrawalCooldownDays: 7,    // 7 days matches admin default
    };
}

// User wallet data
export interface WalletData {
    balance: number;
    onHold: number;
    available: number;
}

export function getWalletData(userData: {
    wallet_balance?: number;
    wallet_on_hold?: number;
}): WalletData {
    const balance = userData.wallet_balance || 0;
    const onHold = userData.wallet_on_hold || 0;
    return {
        balance,
        onHold,
        available: Math.max(0, balance - onHold),
    };
}

// Calculate max wallet usage at checkout
export function calculateMaxWalletUsage(
    cartTotal: number,
    availableBalance: number,
    maxUsagePercent: number = 0.4
): number {
    const maxByPercent = cartTotal * maxUsagePercent;
    return Math.min(maxByPercent, availableBalance);
}

// Check if user can request withdrawal
export interface WithdrawalEligibility {
    canWithdraw: boolean;
    reason?: string;
    nextAvailableDate?: Date;
}

export async function checkWithdrawalEligibility(
    userId: string,
    userData: {
        wallet_balance?: number;
        wallet_on_hold?: number;
        lastWithdrawalRequest?: Timestamp;
        paymentDetails?: {
            fullName?: string;
            phone?: string;
            upiId?: string;
        };
    },
    requestedAmount?: number
): Promise<WithdrawalEligibility> {
    const settings = await getReferralSettings();
    const wallet = getWalletData(userData);

    // Check if user has payment details
    if (
        !userData.paymentDetails?.fullName ||
        !userData.paymentDetails?.phone ||
        !userData.paymentDetails?.upiId
    ) {
        return {
            canWithdraw: false,
            reason: "Please save your payment details (Name, Phone, UPI ID) first.",
        };
    }

    // Check minimum balance
    if (wallet.available < settings.minWithdrawal) {
        return {
            canWithdraw: false,
            reason: `Minimum withdrawal amount is ₹${settings.minWithdrawal}. You have ₹${wallet.available} available.`,
        };
    }

    // Check for existing pending withdrawal
    const withdrawalsRef = collection(db, "withdrawals");
    const pendingQuery = query(
        withdrawalsRef,
        where("userId", "==", userId),
        where("status", "==", "pending")
    );
    const pendingSnapshot = await getDocs(pendingQuery);

    if (!pendingSnapshot.empty) {
        return {
            canWithdraw: false,
            reason: "You already have a pending withdrawal request. Please wait for admin to process it.",
        };
    }

    // Check cooldown period
    if (userData.lastWithdrawalRequest) {
        const lastRequest = userData.lastWithdrawalRequest.toDate();
        const cooldownMs = settings.withdrawalCooldownDays * 24 * 60 * 60 * 1000;
        const nextAvailable = new Date(lastRequest.getTime() + cooldownMs);

        if (Date.now() < nextAvailable.getTime()) {
            return {
                canWithdraw: false,
                reason: `You can only request withdrawal once per ${settings.withdrawalCooldownDays} days.`,
                nextAvailableDate: nextAvailable,
            };
        }
    }

    // Check requested amount if provided
    if (requestedAmount !== undefined) {
        if (requestedAmount < settings.minWithdrawal) {
            return {
                canWithdraw: false,
                reason: `Minimum withdrawal amount is ₹${settings.minWithdrawal}.`,
            };
        }
        if (requestedAmount > wallet.available) {
            return {
                canWithdraw: false,
                reason: `Requested amount exceeds available balance (₹${wallet.available}).`,
            };
        }
    }

    return { canWithdraw: true };
}

// Get transaction history for a user
export interface TransactionLog {
    id: string;
    type: "commission_credit" | "checkout_debit" | "withdrawal_debit";
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: Date;
}

export async function getTransactionHistory(
    userId: string,
    limitCount: number = 20
): Promise<TransactionLog[]> {
    try {
        const logsRef = collection(db, "transactionLogs");
        const q = query(
            logsRef,
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            type: doc.data().type,
            amount: doc.data().amount,
            balanceAfter: doc.data().balanceAfter,
            description: doc.data().description,
            createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
    } catch (error) {
        console.error("Error getting transaction history:", error);
        return [];
    }
}

// Get withdrawal history for a user
export interface WithdrawalRecord {
    id: string;
    amount: number;
    status: "pending" | "paid" | "rejected";
    upiId: string;
    requestedAt: Date;
    processedAt?: Date;
    rejectionReason?: string;
}

export async function getWithdrawalHistory(
    userId: string
): Promise<WithdrawalRecord[]> {
    try {
        const withdrawalsRef = collection(db, "withdrawals");
        const q = query(
            withdrawalsRef,
            where("userId", "==", userId),
            orderBy("requestedAt", "desc")
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            amount: doc.data().amount,
            status: doc.data().status,
            upiId: doc.data().upiId,
            requestedAt: doc.data().requestedAt?.toDate() || new Date(),
            processedAt: doc.data().processedAt?.toDate(),
            rejectionReason: doc.data().rejectionReason,
        }));
    } catch (error) {
        console.error("Error getting withdrawal history:", error);
        return [];
    }
}

// Format currency for display
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format date for display
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}
