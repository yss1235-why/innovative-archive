import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface OrderDetails {
    productName: string;
    description?: string;
    quantity?: number;
    price?: number;
    userName?: string;
}

export interface CartItem {
    name: string;
    price: number;
    quantity: number;
}

// Get WhatsApp number from settings
export async function getWhatsAppNumber(): Promise<string> {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        if (settingsDoc.exists()) {
            return settingsDoc.data().whatsappNumber || "";
        }
    } catch (error) {
        console.error("Error getting WhatsApp number:", error);
    }
    return "";
}

// Generate WhatsApp link for single product order
export function generateWhatsAppLink(phone: string, details: OrderDetails): string {
    const lines = [
        "*New Order Request* 🛍️",
        "------------------",
        `*Item*: ${details.productName}`,
        details.quantity ? `*Quantity*: ${details.quantity}` : "",
        details.price ? `*Price*: ₹${details.price}` : "",
        details.userName ? `*Customer*: ${details.userName}` : "",
        details.description ? `*Details*: ${details.description}` : "",
        "",
        "*Next Step*:",
        "I would like to proceed with this order.",
    ].filter(line => line !== "");

    const message = lines.join("\n");

    return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}

// Generate WhatsApp link for cart checkout
export function generateCartCheckoutLink(phone: string, items: CartItem[], total: number, userName?: string): string {
    const itemsList = items.map(item =>
        `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`
    ).join("\n");

    const lines = [
        "*Checkout Request* 🛒",
        "------------------",
        itemsList,
        "------------------",
        `*Total*: ₹${total}`,
        userName ? `*Customer*: ${userName}` : "",
        "",
        "*Next Step*:",
        "I would like to complete this order.",
    ].filter(line => line !== "");

    const message = lines.join("\n");

    return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}
