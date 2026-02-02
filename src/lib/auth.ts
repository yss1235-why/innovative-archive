"use client";

import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { generateReferralCode, getUserIdByReferralCode } from "./referral";

const googleProvider = new GoogleAuthProvider();

// Admin email - fallback for initial setup
const DEFAULT_ADMIN_EMAIL = "yursccc@gmail.com";

// Check if an email is an admin (checks settings first, then fallback)
async function checkIsAdminEmail(email: string | null): Promise<boolean> {
    if (!email) return false;

    // Always allow the default admin
    if (email === DEFAULT_ADMIN_EMAIL) return true;

    // Check settings for additional admin emails
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        if (settingsDoc.exists()) {
            const adminEmails = settingsDoc.data().adminEmails || [];
            if (Array.isArray(adminEmails) && adminEmails.includes(email)) {
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking admin emails:", error);
    }

    return false;
}

// Sign in with Google
export async function signInWithGoogle(referralCode?: string) {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user exists in Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Validate referral code if provided
            let validReferrerId: string | null = null;
            if (referralCode) {
                const referrerId = await getUserIdByReferralCode(referralCode);
                // Only save if valid and not self-referral
                if (referrerId && referrerId !== user.uid) {
                    validReferrerId = referrerId;
                }
            }

            // Check if user should be admin
            const isAdminUser = await checkIsAdminEmail(user.email);

            // New user - create profile
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                phone: "",
                role: isAdminUser ? "admin" : "user",
                referralCode: generateReferralCode(),
                referredBy: validReferrerId,
                createdAt: serverTimestamp(),
            });
        }

        return user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
}

// Sign out
export async function signOut() {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
}

// Get current user data from Firestore
export async function getUserData(uid: string) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
}

// Check if user is admin
export async function isAdmin(uid: string): Promise<boolean> {
    const userData = await getUserData(uid);
    return userData?.role === "admin";
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}
