/**
 * Indian State Codes for GST
 * 
 * These codes are used in GSTIN and for determining
 * interstate vs intrastate transactions.
 */

export interface StateInfo {
    name: string;
    code: string;
}

// Seller's state (Innovative Archive is based in Manipur)
export const SELLER_STATE: StateInfo = {
    name: "Manipur",
    code: "14",
};

// All Indian states and union territories with GST state codes
export const INDIAN_STATES: StateInfo[] = [
    { name: "Andaman and Nicobar Islands", code: "35" },
    { name: "Andhra Pradesh", code: "37" },
    { name: "Arunachal Pradesh", code: "12" },
    { name: "Assam", code: "18" },
    { name: "Bihar", code: "10" },
    { name: "Chandigarh", code: "04" },
    { name: "Chhattisgarh", code: "22" },
    { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
    { name: "Delhi", code: "07" },
    { name: "Goa", code: "30" },
    { name: "Gujarat", code: "24" },
    { name: "Haryana", code: "06" },
    { name: "Himachal Pradesh", code: "02" },
    { name: "Jammu and Kashmir", code: "01" },
    { name: "Jharkhand", code: "20" },
    { name: "Karnataka", code: "29" },
    { name: "Kerala", code: "32" },
    { name: "Ladakh", code: "38" },
    { name: "Lakshadweep", code: "31" },
    { name: "Madhya Pradesh", code: "23" },
    { name: "Maharashtra", code: "27" },
    { name: "Manipur", code: "14" },
    { name: "Meghalaya", code: "17" },
    { name: "Mizoram", code: "15" },
    { name: "Nagaland", code: "13" },
    { name: "Odisha", code: "21" },
    { name: "Puducherry", code: "34" },
    { name: "Punjab", code: "03" },
    { name: "Rajasthan", code: "08" },
    { name: "Sikkim", code: "11" },
    { name: "Tamil Nadu", code: "33" },
    { name: "Telangana", code: "36" },
    { name: "Tripura", code: "16" },
    { name: "Uttar Pradesh", code: "09" },
    { name: "Uttarakhand", code: "05" },
    { name: "West Bengal", code: "19" },
];

// Quick lookup map
export const STATE_CODE_MAP: Record<string, string> = Object.fromEntries(
    INDIAN_STATES.map((s) => [s.name, s.code])
);

/**
 * Get state code by state name
 */
export function getStateCode(stateName: string): string {
    return STATE_CODE_MAP[stateName] || "";
}

/**
 * Get state name by code
 */
export function getStateName(code: string): string {
    const state = INDIAN_STATES.find((s) => s.code === code);
    return state?.name || "";
}

/**
 * Check if transaction is interstate
 * 
 * @param buyerState - Buyer's state name
 * @returns true if buyer is in different state than seller
 */
export function isInterstate(buyerState: string): boolean {
    return buyerState !== SELLER_STATE.name;
}

/**
 * Get all states sorted alphabetically
 */
export function getSortedStates(): StateInfo[] {
    return [...INDIAN_STATES].sort((a, b) => a.name.localeCompare(b.name));
}
