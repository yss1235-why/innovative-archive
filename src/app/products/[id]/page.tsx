import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProductDetailClient } from "./ProductDetailClient";

// Generate static params for all products at build time
// Required for static export (output: 'export') with dynamic routes
export async function generateStaticParams() {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        return snapshot.docs.map((doc) => ({
            id: doc.id,
        }));
    } catch (error) {
        console.error("Error fetching products for static params:", error);
        // Return empty array - pages will still work client-side
        return [];
    }
}

// Page component receives the id param
export default async function ProductDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    return <ProductDetailClient productId={id} />;
}
