"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { ShareButton } from "@/components/ui/ShareButton";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { useCart } from "@/lib/CartContext";
import { ArrowLeft, ShoppingCart, Check, Loader2, Download, ZoomIn } from "lucide-react";

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    offerPrice?: number;
    priceType?: "free" | "subscription";
    imageUrl: string;
    images?: string[];
    description: string;
    downloadUrl?: string;
    gstRate?: number;
    hsnCode?: string;
}

interface ProductDetailClientProps {
    productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailClientProps) {
    const router = useRouter();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [addedToCart, setAddedToCart] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) return;

            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    // Get all images (combine images array with legacy imageUrl)
    const getAllImages = (): string[] => {
        if (!product) return [];
        if (product.images && product.images.length > 0) {
            return product.images;
        }
        return product.imageUrl ? [product.imageUrl] : [];
    };

    const images = getAllImages();
    const currentImage = images[selectedImageIndex] || "";

    const handleAddToCart = () => {
        if (!product) return;

        addToCart({
            id: product.id,
            name: product.name,
            price: product.offerPrice && product.offerPrice < product.price
                ? product.offerPrice
                : product.price,
            category: product.category,
            imageUrl: product.imageUrl,
            gstRate: product.gstRate,
            hsnCode: product.hsnCode,
        });

        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleDownload = () => {
        if (product?.downloadUrl) {
            window.open(product.downloadUrl, "_blank");
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </main>
        );
    }

    if (!product) {
        return (
            <main className="relative min-h-screen w-full bg-stone-950 text-white">
                <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />
                <div className="relative z-10">
                    <Navbar />
                    <div className="container mx-auto px-4 pt-32 pb-20 text-center">
                        <h1 className="text-2xl font-light mb-4">Product Not Found</h1>
                        <p className="text-stone-500 mb-8">The product you&apos;re looking for doesn&apos;t exist.</p>
                        <button
                            onClick={() => router.push("/products")}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors cursor-pointer"
                        >
                            Browse Products
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const hasDiscount = product.offerPrice && product.offerPrice < product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.price - product.offerPrice!) / product.price) * 100)
        : 0;

    return (
        <main className="relative min-h-screen w-full bg-stone-950 text-white">
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />

            <div className="relative z-10">
                <Navbar />

                <div className="container mx-auto px-4 pt-28 pb-20 max-w-5xl">
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-6 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Image Gallery */}
                        <div className="space-y-4">
                            {/* Main Image */}
                            <GlassCard className="p-2">
                                <div
                                    className="aspect-square rounded-lg bg-stone-900 overflow-hidden relative cursor-zoom-in group"
                                    onClick={() => setLightboxOpen(true)}
                                >
                                    {currentImage ? (
                                        <>
                                            <img
                                                src={currentImage}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-700">
                                            No Image
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            {/* Thumbnail Gallery */}
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {images.map((img, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer transition-all ${index === selectedImageIndex
                                                    ? "ring-2 ring-purple-500"
                                                    : "opacity-60 hover:opacity-100"
                                                }`}
                                        >
                                            <img
                                                src={img}
                                                alt={`${product.name} ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-6">
                            <div>
                                <span className="text-sm text-purple-400 uppercase tracking-wider">
                                    {product.category}
                                </span>
                                <h1 className="text-3xl font-light mt-1">{product.name}</h1>
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-3">
                                {product.category === "app" ? (
                                    product.priceType === "subscription" ? (
                                        <>
                                            {hasDiscount ? (
                                                <>
                                                    <span className="text-3xl font-medium text-green-400">
                                                        ₹{product.offerPrice}/mo
                                                    </span>
                                                    <span className="text-lg text-stone-500 line-through">
                                                        ₹{product.price}
                                                    </span>
                                                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-sm rounded">
                                                        {discountPercent}% OFF
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-3xl font-medium text-cyan-400">
                                                    ₹{product.price}/month
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-3xl font-medium text-cyan-400">Free</span>
                                    )
                                ) : (
                                    <>
                                        {hasDiscount ? (
                                            <>
                                                <span className="text-3xl font-medium text-green-400">
                                                    ₹{product.offerPrice}
                                                </span>
                                                <span className="text-lg text-stone-500 line-through">
                                                    ₹{product.price}
                                                </span>
                                                <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-sm rounded">
                                                    {discountPercent}% OFF
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-3xl font-medium">₹{product.price}</span>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Description */}
                            <GlassCard>
                                <h2 className="text-lg font-medium mb-3">Description</h2>
                                <p className="text-stone-400 whitespace-pre-wrap leading-relaxed">
                                    {product.description || "No description available."}
                                </p>
                            </GlassCard>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {product.category === "app" && product.priceType === "free" ? (
                                    <button
                                        onClick={handleDownload}
                                        disabled={!product.downloadUrl}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddToCart}
                                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer ${addedToCart
                                                ? "bg-green-600 text-white"
                                                : "bg-purple-600 hover:bg-purple-500 text-white"
                                            }`}
                                    >
                                        {addedToCart ? (
                                            <>
                                                <Check className="w-5 h-5" />
                                                Added to Cart!
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-5 h-5" />
                                                Add to Cart
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Product Details */}
                            {(product.gstRate !== undefined || product.hsnCode) && (
                                <div className="text-sm text-stone-500 space-y-1">
                                    {product.hsnCode && <p>HSN Code: {product.hsnCode}</p>}
                                    {product.gstRate !== undefined && <p>GST: {product.gstRate}%</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Share Button */}
            <ShareButton
                productId={product.id}
                productName={product.name}
                variant="floating"
            />

            {/* Image Lightbox */}
            <ImageLightbox
                images={images}
                initialIndex={selectedImageIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </main>
    );
}
