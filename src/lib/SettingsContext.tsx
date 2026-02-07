"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface AppSettings {
    commissionEnabled: boolean;
    commissionRate: number;
    maxCommissionPurchases: number;
    whatsappNumber: string;
    minWithdrawal: number;
    withdrawalCooldownDays: number;
    maxWalletUsagePercent?: number;
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    serviceImages?: {
        "3d-print"?: string;
        mug?: string;
        tshirt?: string;
        app?: string;
    };
}

const defaultSettings: AppSettings = {
    commissionEnabled: true,
    commissionRate: 10,
    maxCommissionPurchases: 1,
    whatsappNumber: "",
    minWithdrawal: 100,
    withdrawalCooldownDays: 7,
    maxWalletUsagePercent: 40,
};

interface SettingsContextType {
    settings: AppSettings;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    loading: true,
});

export function useSettings() {
    return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to real-time updates from Firestore settings
        const unsubscribe = onSnapshot(
            doc(db, "settings", "app"),
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings({ ...defaultSettings, ...snapshot.data() as AppSettings });
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching settings:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}
