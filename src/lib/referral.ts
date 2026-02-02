import { db } from "./firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
} from "firebase/firestore";

// Generate a unique 6-character referral code
export function generateReferralCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get the referral link for a user
export function getReferralLink(referralCode: string): string {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${referralCode}`;
}

// Extract referral code from URL
export function getReferralCodeFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("ref");
}

// Save referral code to localStorage (for guest users)
export function saveReferralToLocalStorage(referralCode: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("pendingReferral", referralCode);
    localStorage.setItem("pendingReferralTime", Date.now().toString());
}

// Get pending referral from localStorage
export function getPendingReferral(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("pendingReferral");
}

// Clear pending referral from localStorage
export function clearPendingReferral(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("pendingReferral");
    localStorage.removeItem("pendingReferralTime");
}

// Remove ref parameter from URL without page reload
export function cleanReferralFromUrl(): void {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("ref")) {
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
    }
}

// Look up user ID by referral code
export async function getUserIdByReferralCode(
    referralCode: string
): Promise<string | null> {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("referralCode", "==", referralCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;
        return snapshot.docs[0].id;
    } catch (error) {
        console.error("Error looking up referral code:", error);
        return null;
    }
}

// Apply referral to user on signup or login
export async function applyReferralToUser(userId: string): Promise<boolean> {
    const pendingReferral = getPendingReferral();
    if (!pendingReferral) return false;

    try {
        // Check if user already has a referrer
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists() && userDoc.data().referredBy) {
            clearPendingReferral();
            return false; // Already has referrer
        }

        // Look up the referrer's user ID
        const referrerId = await getUserIdByReferralCode(pendingReferral);
        if (!referrerId || referrerId === userId) {
            clearPendingReferral();
            return false; // Invalid or self-referral
        }

        // Apply referral to user document
        await updateDoc(doc(db, "users", userId), {
            referredBy: referrerId,
            referredAt: Timestamp.now(),
        });

        clearPendingReferral();
        return true;
    } catch (error) {
        console.error("Error applying referral:", error);
        return false;
    }
}

// Initialize referral code for a user if they don't have one
export async function ensureUserHasReferralCode(userId: string): Promise<string> {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists() && userDoc.data().referralCode) {
            return userDoc.data().referralCode;
        }

        // Generate unique referral code
        let code = generateReferralCode();
        let attempts = 0;

        while (attempts < 10) {
            const existing = await getUserIdByReferralCode(code);
            if (!existing) break;
            code = generateReferralCode();
            attempts++;
        }

        // Save to user document
        if (userDoc.exists()) {
            await updateDoc(doc(db, "users", userId), { referralCode: code });
        } else {
            await setDoc(doc(db, "users", userId), { referralCode: code }, { merge: true });
        }

        return code;
    } catch (error) {
        console.error("Error ensuring referral code:", error);
        throw error;
    }
}

// Track referral on page load
export async function trackReferralOnPageLoad(userId?: string): Promise<void> {
    const referralCode = getReferralCodeFromUrl();

    if (referralCode) {
        cleanReferralFromUrl();

        if (userId) {
            // User is logged in - apply directly
            await applyReferralToUser(userId);
        } else {
            // Guest - save to localStorage
            saveReferralToLocalStorage(referralCode);
        }
    }
}

// Get referral statistics for a user
export interface ReferralStats {
    totalReferred: number;
    totalPurchased: number;
    totalEarned: number;
    pendingCommissions: number;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
    try {
        // Count users referred by this user
        const usersRef = collection(db, "users");
        const referredQuery = query(usersRef, where("referredBy", "==", userId));
        const referredSnapshot = await getDocs(referredQuery);

        const totalReferred = referredSnapshot.size;
        let totalPurchased = 0;

        referredSnapshot.forEach((doc) => {
            if (doc.data().hasFirstPurchase) {
                totalPurchased++;
            }
        });

        // Get commission totals
        const commissionsRef = collection(db, "pendingCommissions");
        const commissionsQuery = query(commissionsRef, where("referrerId", "==", userId));
        const commissionsSnapshot = await getDocs(commissionsQuery);

        let totalEarned = 0;
        let pendingCommissions = 0;

        commissionsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === "approved") {
                totalEarned += data.commissionAmount || 0;
            } else if (data.status === "pending") {
                pendingCommissions += data.commissionAmount || 0;
            }
        });

        return {
            totalReferred,
            totalPurchased,
            totalEarned,
            pendingCommissions,
        };
    } catch (error) {
        console.error("Error getting referral stats:", error);
        return {
            totalReferred: 0,
            totalPurchased: 0,
            totalEarned: 0,
            pendingCommissions: 0,
        };
    }
}
