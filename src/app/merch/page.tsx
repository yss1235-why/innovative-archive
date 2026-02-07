"use client";
import { Navbar } from "@/components/ui/Navbar";
import { useAuth } from "@/lib/AuthContext";
import { createOrder } from "@/lib/orders";
import { generateWhatsAppLink, getWhatsAppNumber } from "@/lib/whatsapp";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft, Loader2, Send, Upload, Check, X, Image } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mug color options
const MUG_COLORS = [
    { id: 'white', name: 'White', hex: '#ffffff' },
    { id: 'black', name: 'Black', hex: '#1c1917' },
    { id: 'purple', name: 'Purple', hex: '#a855f7' },
] as const;

type MugColor = typeof MUG_COLORS[number]['id'];

export default function MerchPage() {
    const { user, userData } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [selectedColor, setSelectedColor] = useState<MugColor>('white');
    const [mugPrice, setMugPrice] = useState<number>(499); // Default price in ₹
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch mug price from settings/products
    useEffect(() => {
        const fetchMugPrice = async () => {
            try {
                // Try to get from products collection first
                const settingsDoc = await getDoc(doc(db, "settings", "app"));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.customMugPrice) {
                        setMugPrice(data.customMugPrice);
                    }
                }
            } catch (error) {
                // Use default price if fetch fails
            }
        };
        fetchMugPrice();
    }, []);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        setIsUploading(true);
        setUploadedFileName(file.name);

        try {
            // Upload to Cloudinary
            const result = await uploadToCloudinary(file, "mug-designs");
            if (result.success && result.url) {
                setUploadedImage(result.url);
            } else {
                alert(result.error || "Failed to upload image. Please try again.");
            }
        } catch (error) {
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const clearUploadedImage = () => {
        setUploadedImage(null);
        setUploadedFileName("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            const phone = await getWhatsAppNumber();
            if (!phone) {
                alert("WhatsApp number not configured. Please contact support.");
                return;
            }

            const colorName = MUG_COLORS.find(c => c.id === selectedColor)?.name || 'White';

            // If user is logged in, create order in Firestore for referral tracking
            if (user && userData) {
                try {
                    await createOrder({
                        userId: user.uid,
                        userEmail: user.email || "",
                        userName: userData.displayName || userData.email || "Customer",
                        items: [{
                            id: "custom-mug",
                            name: `Custom 3D Mug (${colorName})`,
                            price: mugPrice,
                            quantity: 1,
                            category: "mug",
                        }],
                        total: mugPrice,
                    });
                } catch (error) {
                    // Continue to WhatsApp even if order creation fails
                }
            }

            // Build description with customization details
            let description = `Color: ${colorName}`;
            if (uploadedImage) {
                description += `\nDesign uploaded: ${uploadedFileName}`;
                description += `\nImage URL: ${uploadedImage}`;
            } else {
                description += `\n(No design uploaded yet - will send via chat)`;
            }

            const link = generateWhatsAppLink(phone, {
                productName: "Custom 3D Mug",
                description: description
            });
            window.open(link, '_blank');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <main className="min-h-screen bg-stone-950 text-white selection:bg-purple-500/30">
            <Navbar />

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            <div className="container mx-auto px-4 pt-32 pb-12 flex flex-col md:flex-row gap-12 min-h-screen">
                {/* Left: Product Preview */}
                <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
                    {/* Mug Preview */}
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: selectedColor === 'white' ? '#f5f5f4' : selectedColor === 'black' ? '#1c1917' : '#581c87' }}
                    >
                        {uploadedImage ? (
                            <div className="relative w-full h-full flex items-center justify-center p-8">
                                <img
                                    src={uploadedImage}
                                    alt="Your design"
                                    className="max-w-[60%] max-h-[60%] object-contain rounded-lg shadow-2xl"
                                />
                                <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-stone-400 bg-black/50 px-3 py-1 rounded-full">
                                    Preview of your design on {MUG_COLORS.find(c => c.id === selectedColor)?.name} mug
                                </p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Image className={`w-16 h-16 mx-auto mb-4 ${selectedColor === 'white' ? 'text-stone-400' : 'text-white/40'}`} />
                                <p className={`font-light tracking-widest text-sm ${selectedColor === 'white' ? 'text-stone-500' : 'text-white/50'}`}>
                                    Upload your design to preview
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-xs text-stone-400">
                        Color: {MUG_COLORS.find(c => c.id === selectedColor)?.name}
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-96 flex flex-col gap-6">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-white mb-6 text-sm">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                        <h1 className="text-4xl font-thin tracking-tighter mb-2">Custom Mug</h1>
                        <p className="text-stone-400 text-sm">High-quality ceramic. Dishwasher safe.</p>
                        <p className="text-2xl font-light mt-4">₹{mugPrice}</p>
                    </div>

                    <div className="h-px bg-white/10 my-2"></div>

                    {/* Customization Steps */}
                    <div className="space-y-6 flex-1">
                        {/* Step 1: Upload Design */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                                1. Upload Design
                            </label>

                            {uploadedImage ? (
                                <div className="w-full border border-green-500/30 bg-green-500/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <div>
                                                <p className="text-sm text-green-400">Image uploaded</p>
                                                <p className="text-xs text-stone-500 truncate max-w-[180px]">{uploadedFileName}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={clearUploadedImage}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleFileSelect}
                                    disabled={isUploading}
                                    className="w-full border border-dashed border-white/20 rounded-xl h-32 flex flex-col items-center justify-center gap-3 text-stone-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="text-sm">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6" />
                                            <span className="text-sm">Click to Upload Image</span>
                                            <span className="text-xs text-stone-600">Max 5MB • JPG, PNG, WebP</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Step 2: Color Selection */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                                2. Color
                            </label>
                            <div className="flex gap-3">
                                {MUG_COLORS.map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => setSelectedColor(color.id)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === color.id
                                                ? 'border-purple-500 ring-2 ring-purple-500/50 scale-110'
                                                : 'border-white/20'
                                            }`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-stone-500 mt-2">
                                Selected: {MUG_COLORS.find(c => c.id === selectedColor)?.name}
                            </p>
                        </div>
                    </div>

                    {/* Checkout */}
                    <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full bg-white text-black py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Buy on WhatsApp
                            </>
                        )}
                    </button>
                    <p className="text-xs text-center text-stone-600">
                        You will be redirected to chat with us.
                        {!uploadedImage && <><br />You can also attach your design image there.</>}
                    </p>
                </div>
            </div>
        </main>
    );
}
