"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { collection, query, where, onSnapshot, Query, DocumentData, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getActiveCategories, getIconComponent, type Category } from "@/lib/categories";
import { useSettings } from "@/lib/SettingsContext";
import { ShoppingCart, Loader2, Download, Copy, Check, Package } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    category: string;  // Dynamic from Firestore
    price: number;
    offerPrice?: number;  // Discounted/sale price
    priceType?: "free" | "subscription";  // For app category
    imageUrl: string;
    description: string;
    downloadUrl?: string;
    gstRate?: number;   // GST percentage
    hsnCode?: string;   // HSN/SAC code
}

// Category display object for UI (constructed from Firestore data)
interface CategoryDisplay {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }> | null;
    color: string;
}

// Wrapper with Suspense
export default function ProductsPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </main>
        }>
            <ProductsContent />
        </Suspense>
    );
}

function ProductsContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get("category") || "all";
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<CategoryDisplay[]>([{ id: "all", name: "All Products", icon: null, color: "stone" }]);
    const [loading, setLoading] = useState(true);
    const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
    const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
    const [whatsappNumber, setWhatsappNumber] = useState<string>("");
    const { user, userData } = useAuth();
    const { addToCart } = useCart();
    const { settings } = useSettings();

    // Fetch categories from Firestore
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const firestoreCategories = await getActiveCategories();
                const categoryDisplays: CategoryDisplay[] = [
                    { id: "all", name: "All Products", icon: null, color: "stone" },
                    ...firestoreCategories.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        icon: getIconComponent(cat.icon),
                        color: cat.color,
                    }))
                ];
                setCategories(categoryDisplays);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch WhatsApp number from settings
    useEffect(() => {
        const fetchWhatsApp = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, "settings", "app"));
                if (settingsDoc.exists()) {
                    setWhatsappNumber(settingsDoc.data().whatsappNumber || "");
                }
            } catch (error) {
                console.error("Error fetching WhatsApp number:", error);
            }
        };
        fetchWhatsApp();
    }, []);

    // Real-time products listener - updates immediately when admin adds/removes products
    useEffect(() => {
        setLoading(true);
        const productsRef = collection(db, "products");
        let q: Query<DocumentData> = productsRef;

        if (activeCategory !== "all") {
            q = query(productsRef, where("category", "==", activeCategory));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
            setProducts(productList);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to products:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeCategory]);

    const getCategoryColor = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat?.color || "stone";
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
                                                    loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {(() => {
                                                        const cat = categories.find(c => c.id === product.category);
                                                        const IconComponent = cat?.icon || Package;
                                                        return <IconComponent className="w-12 h-12 text-stone-700" />;
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <h3 className="font-medium mb-1">{product.name}</h3>
                                        <p className="text-stone-500 text-sm mb-3 line-clamp-2">{product.description}</p>

                                        <div className="flex items-center justify-between">
                                            {product.category === "app" ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        {product.priceType === "subscription" ? (
                                                            product.offerPrice && product.offerPrice < product.price ? (
                                                                <>
                                                                    <span className="text-sm font-medium text-green-400">₹{product.offerPrice}/mo</span>
                                                                    <span className="text-xs text-stone-500 line-through">₹{product.price}</span>
                                                                    <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                                                                        {Math.round(((product.price - product.offerPrice) / product.price) * 100)}% OFF
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm text-cyan-400 font-medium">₹{product.price}/month</span>
                                                            )
                                                        ) : (
                                                            <span className="text-sm text-cyan-400 font-medium">Free</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Add to Cart for subscription apps */}
                                                        {product.priceType === "subscription" && (
                                                            <button
                                                                onClick={() => {
                                                                    addToCart({
                                                                        id: product.id,
                                                                        name: product.name,
                                                                        price: product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price,
                                                                        category: product.category,
                                                                        imageUrl: product.imageUrl,
                                                                        gstRate: product.gstRate,
                                                                        hsnCode: product.hsnCode,
                                                                    });
                                                                    setAddedToCartId(product.id);
                                                                    setTimeout(() => setAddedToCartId(null), 1500);
                                                                }}
                                                                className={`p-2 rounded-full transition-all cursor-pointer ${addedToCartId === product.id
                                                                    ? "bg-green-500/20 text-green-400"
                                                                    : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                                                                    }`}
                                                            >
                                                                {addedToCartId === product.id ? (
                                                                    <Check className="w-4 h-4" />
                                                                ) : (
                                                                    <ShoppingCart className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {/* Download button for apps with download URL */}
                                                        {product.downloadUrl && (
                                                            <a
                                                                href={product.downloadUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        {product.offerPrice && product.offerPrice < product.price ? (
                                                            <>
                                                                <span className="text-lg font-medium text-green-400">₹{product.offerPrice}</span>
                                                                <span className="text-sm text-stone-500 line-through">₹{product.price}</span>
                                                                <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                                                                    {Math.round(((product.price - product.offerPrice) / product.price) * 100)}% OFF
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-lg font-light">₹{product.price}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            addToCart({
                                                                id: product.id,
                                                                name: product.name,
                                                                price: product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price,
                                                                category: product.category,
                                                                imageUrl: product.imageUrl,
                                                                gstRate: product.gstRate,
                                                                hsnCode: product.hsnCode,
                                                            });
                                                            setAddedToCartId(product.id);
                                                            setTimeout(() => setAddedToCartId(null), 1500);
                                                        }}
                                                        className={`p-2 rounded-full transition-all cursor-pointer ${addedToCartId === product.id
                                                            ? "bg-green-500/20 text-green-400"
                                                            : `bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20`
                                                            }`}
                                                    >
                                                        {addedToCartId === product.id ? (
                                                            <Check className="w-4 h-4" />
                                                        ) : (
                                                            <ShoppingCart className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Referral link option - only show if commission enabled */}
                                        {settings.commissionEnabled && user && userData?.referralCode && product.category !== "app" && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-xs text-stone-600 mb-2">Share & Earn:</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs text-green-400/70 bg-stone-900/50 px-2 py-1 rounded truncate">
                                                        {typeof window !== 'undefined' ? `${window.location.origin}/products?category=${product.category}&ref=${userData.referralCode}` : `?ref=${userData.referralCode}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            const link = `${window.location.origin}/products?category=${product.category}&ref=${userData.referralCode}`;
                                                            navigator.clipboard.writeText(link);
                                                            setCopiedProductId(product.id);
                                                            setTimeout(() => setCopiedProductId(null), 2000);
                                                        }}
                                                        className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer flex-shrink-0"
                                                        title="Copy referral link"
                                                    >
                                                        {copiedProductId === product.id ? (
                                                            <Check className="w-3 h-3" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </div>
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
                                href={whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'd like to discuss a custom order` : '#'}
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
