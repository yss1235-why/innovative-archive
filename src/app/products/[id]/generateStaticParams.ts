import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Generate static params for all existing products
// This runs at build time to pre-render product pages
export async function generateStaticParams() {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        return snapshot.docs.map((doc) => ({
            id: doc.id,
        }));
    } catch (error) {
        console.error("Error fetching products for static generation:", error);
        // Return empty array - pages will be client-rendered
        return [];
    }
}
