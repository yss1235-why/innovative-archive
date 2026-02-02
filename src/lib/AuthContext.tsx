"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { onAuthChange, getUserData } from "@/lib/auth";
import { trackReferralOnPageLoad, applyReferralToUser, ensureUserHasReferralCode } from "@/lib/referral";

interface PaymentDetails {
    fullName: string;
    phone: string;
    upiId: string;
}

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    phone: string;
    role: "user" | "admin";
    referralCode: string;
    referredBy: string | null;
    // Wallet fields
    wallet_balance: number;
    wallet_on_hold: number;
    hasFirstPurchase: boolean;
    // Payment details
    paymentDetails?: PaymentDetails;
    nameChangeCount: number;
    lastWithdrawalRequest?: Timestamp;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    isAdmin: boolean;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
    isAdmin: false,
    refreshUserData: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUserData = async () => {
        if (user) {
            const data = await getUserData(user.uid);
            setUserData(data as UserData | null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Ensure user has a referral code
                await ensureUserHasReferralCode(firebaseUser.uid);

                // Apply any pending referral from localStorage
                await applyReferralToUser(firebaseUser.uid);

                // Get user data
                const data = await getUserData(firebaseUser.uid);
                setUserData(data as UserData | null);
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Track referral on initial page load
    useEffect(() => {
        trackReferralOnPageLoad(user?.uid);
    }, [user?.uid]);

    const isAdmin = userData?.role === "admin";

    return (
        <AuthContext.Provider value={{ user, userData, loading, isAdmin, refreshUserData }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

