"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Box, Coffee, Shirt, ShoppingCart, Loader2 } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    category: "3d-print" | "mug" | "tshirt";
    price: number;
    imageUrl: string;
    description: string;
}

const categories = [
    { id: "all", name: "All Products", icon: null },
    { id: "3d-print", name: "3D Printing", icon: Box },
    { id: "mug", name: "Mugs", icon: Coffee },
    { id: "tshirt", name: "T-Shirts", icon: Shirt },
];

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get("category") || "all";
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, userData } = useAuth();

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const productsRef = collection(db, "products");
                let q = productsRef;

                if (activeCategory !== "all") {
                    q = query(productsRef, where("category", "==", activeCategory)) as typeof productsRef;
                }

                const snapshot = await getDocs(q);
                const productList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];

                setProducts(productList);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
            setLoading(false);
        }

        fetchProducts();
    }, [activeCategory]);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "3d-print": return "blue";
            case "mug": return "orange";
            case "tshirt": return "purple";
            default: return "stone";
        }
    };

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-stone-950 text-white selection:bg-purple-500/30">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />

            <div className="relative z-10">
                <Navbar />

                <div className="container mx-auto px-4 pt-32 pb-20">
                    <h1 className="text-4xl font-thin text-center mb-4">Our Products</h1>
                    <p className="text-stone-400 text-center mb-8 max-w-lg mx-auto">
                        Browse our collection of custom printed products. Each item is made with care and quality.
                    </p>

                    {/* Category Tabs */}
                    <div className="flex justify-center gap-2 mb-12 flex-wrap">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${activeCategory === cat.id
                                        ? "bg-white text-black"
                                        : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white border border-white/10"
                                    }`}
                            >
                                {cat.icon && <cat.icon className="w-4 h-4" />}
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Products Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-stone-500 mb-4">No products found in this category yet.</p>
                            <p className="text-stone-600 text-sm">Check back soon or contact us for custom orders!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => {
                                const color = getCategoryColor(product.category);
                                return (
                                    <GlassCard
                                        key={product.id}
                                        className={`group cursor-pointer hover:border-${color}-500/40 transition-all`}
                                    >
                                        {/* Product Image */}
                                        <div className="aspect-square rounded-lg bg-stone-900 mb-4 overflow-hidden">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {product.category === "3d-print" && <Box className="w-12 h-12 text-stone-700" />}
                                                    {product.category === "mug" && <Coffee className="w-12 h-12 text-stone-700" />}
                                                    {product.category === "tshirt" && <Shirt className="w-12 h-12 text-stone-700" />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <h3 className="font-medium mb-1">{product.name}</h3>
                                        <p className="text-stone-500 text-sm mb-3 line-clamp-2">{product.description}</p>

                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-light">₹{product.price}</span>
                                            <button className={`p-2 rounded-full bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20 transition-colors cursor-pointer`}>
                                                <ShoppingCart className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Referral link option */}
                                        {user && userData?.referralCode && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-xs text-stone-600 mb-1">Share & Earn:</p>
                                                <code className="text-xs text-green-400/70 break-all">
                                                    ?ref={userData.referralCode}
                                                </code>
                                            </div>
                                        )}
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}

                    {/* Custom Order CTA */}
                    <div className="mt-16 text-center">
                        <GlassCard className="max-w-xl mx-auto">
                            <h3 className="text-xl font-light mb-2">Need Something Custom?</h3>
                            <p className="text-stone-400 text-sm mb-4">
                                We offer custom design services. Contact us with your idea!
                            </p>
                            <Link
                                href="https://wa.me/919876543210?text=Hi, I'd like to discuss a custom order"
                                target="_blank"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Chat on WhatsApp
                            </Link>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </main>
    );
}
