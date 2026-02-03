/**
 * GST Calculation Utilities
 * 
 * Handles GST calculations for Indian tax compliance:
 * - Reverse calculation (extracting GST from inclusive price)
 * - Tax split (CGST+SGST for intrastate, IGST for interstate)
 */

// Default GST rates by product category
export const DEFAULT_GST_RATES: Record<string, number> = {
    "3d-print": 18,  // Printing services (HSN: 9989)
    "mug": 12,       // Ceramic tableware (HSN: 6912)
    "tshirt": 5,     // Under ₹1000/piece (HSN: 6109)
    "app": 18,       // Digital services (HSN: 9984)
};

// Default HSN/SAC codes by category
export const DEFAULT_HSN_CODES: Record<string, string> = {
    "3d-print": "9989",
    "mug": "6912",
    "tshirt": "6109",
    "app": "9984",
};

// Valid GST rates in India
export type GSTRate = 0 | 5 | 12 | 18 | 28;

/**
 * Calculate GST from an inclusive price (reverse calculation)
 * 
 * @param inclusivePrice - The price shown to customer (includes GST)
 * @param gstRate - The GST percentage (e.g., 18 for 18%)
 * @returns Object with basePrice, gstAmount
 * 
 * @example
 * // T-Shirt @ ₹250 with 5% GST
 * calculateGSTFromInclusive(250, 5)
 * // Returns: { basePrice: 238.10, gstAmount: 11.90 }
 */
export function calculateGSTFromInclusive(
    inclusivePrice: number,
    gstRate: number
): { basePrice: number; gstAmount: number } {
    if (gstRate === 0 || inclusivePrice === 0) {
        return { basePrice: inclusivePrice, gstAmount: 0 };
    }

    const divisor = 1 + (gstRate / 100);
    const basePrice = inclusivePrice / divisor;
    const gstAmount = inclusivePrice - basePrice;

    return {
        basePrice: roundToTwo(basePrice),
        gstAmount: roundToTwo(gstAmount),
    };
}

/**
 * Split GST into CGST/SGST or IGST based on interstate status
 * 
 * @param gstAmount - Total GST amount
 * @param isInterstate - true if buyer is in different state than seller
 * @returns Object with cgst, sgst, igst amounts
 */
export function splitGST(
    gstAmount: number,
    isInterstate: boolean
): { cgst: number; sgst: number; igst: number } {
    if (isInterstate) {
        // Interstate: Only IGST applies
        return {
            cgst: 0,
            sgst: 0,
            igst: roundToTwo(gstAmount),
        };
    } else {
        // Intrastate: Split equally between CGST and SGST
        const half = gstAmount / 2;
        return {
            cgst: roundToTwo(half),
            sgst: roundToTwo(half),
            igst: 0,
        };
    }
}

/**
 * Calculate complete tax breakdown for an item
 */
export function calculateItemTax(
    unitPrice: number,
    quantity: number,
    gstRate: number,
    isInterstate: boolean
): {
    basePrice: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
} {
    const totalPrice = unitPrice * quantity;
    const { basePrice, gstAmount } = calculateGSTFromInclusive(totalPrice, gstRate);
    const { cgst, sgst, igst } = splitGST(gstAmount, isInterstate);

    return {
        basePrice,
        gstAmount,
        cgst,
        sgst,
        igst,
        totalAmount: totalPrice,
    };
}

/**
 * Get default GST rate for a category
 */
export function getDefaultGSTRate(category: string): GSTRate {
    const rate = DEFAULT_GST_RATES[category];
    return (rate as GSTRate) || 18; // Default to 18% if category not found
}

/**
 * Get default HSN code for a category
 */
export function getDefaultHSNCode(category: string): string {
    return DEFAULT_HSN_CODES[category] || "";
}

/**
 * Round a number to 2 decimal places
 */
function roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Convert number to words (for invoice total)
 * Simplified version for amounts up to ₹99,999
 */
export function amountToWords(amount: number): string {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    if (rupees === 0 && paise === 0) return "Zero Rupees Only";

    const convertHundreds = (n: number): string => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertHundreds(n % 100) : "");
    };

    const convertThousands = (n: number): string => {
        if (n < 1000) return convertHundreds(n);
        if (n < 100000) {
            const thousands = Math.floor(n / 1000);
            const remainder = n % 1000;
            return convertHundreds(thousands) + " Thousand" + (remainder ? " " + convertHundreds(remainder) : "");
        }
        // For lakhs and above
        const lakhs = Math.floor(n / 100000);
        const remainder = n % 100000;
        return convertHundreds(lakhs) + " Lakh" + (remainder ? " " + convertThousands(remainder) : "");
    };

    let result = "";
    if (rupees > 0) {
        result = convertThousands(rupees) + " Rupees";
    }
    if (paise > 0) {
        result += (result ? " and " : "") + convertHundreds(paise) + " Paise";
    }
    result += " Only";

    return result;
}
