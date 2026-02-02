"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import {
    collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
    getDoc, setDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import {
    Package, ShoppingBag, Users, Settings, Loader2,
    Check, X, Trash2, Plus, Upload, Save, Phone, Image,
    Wallet, Banknote, AlertCircle, RefreshCw
} from "lucide-react";

type TabType = "orders" | "products" | "referrals" | "withdrawals" | "wallets" | "settings";

interface Order {
    id: string;
    userId: string;
    userEmail?: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    status: "pending" | "processing" | "delivered";
    createdAt: { seconds: number };
    userPhone?: string;
}

interface Product {
    id: string;
    name: string;
    category: "3d-print" | "mug" | "tshirt" | "app";
    price: number;
    imageUrl: string;
    description: string;
    downloadUrl?: string;
}

interface Referral {
    id: string;
    referrerId: string;
    referrerEmail?: string;
    referrerPhone?: string;
    refereeId: string;
    commission: number;
    status: "pending" | "paid";
    createdAt: { seconds: number };
}

interface Withdrawal {
    id: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    amount: number;
    paymentDetails: { fullName: string; phone: string; upiId: string };
    status: "pending" | "approved" | "rejected";
    requestedAt: { seconds: number };
    processedAt?: { seconds: number };
    adminNote?: string;
}

interface UserWallet {
    id: string;
    email: string;
    displayName: string;
    wallet_balance: number;
    wallet_on_hold: number;
    referralCode: string;
}

interface AppSettings {
    commissionRate: number;
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
    whatsappNumber: "",
    commissionRate: 10,
    minWithdrawal: 100,
    withdrawalCooldownDays: 7,
    maxWalletUsagePercent: 40,
    serviceImages: {
        "3d-print": "/service_3d_printing.png",
        mug: "/service_custom_mugs.png",
        tshirt: "/service_tshirts.png",
        app: "/service_apps.png",
    },
};

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, loading } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>("orders");
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [dataLoading, setDataLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshingProducts, setRefreshingProducts] = useState(false);
    const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
    const [uploadingService, setUploadingService] = useState<string | null>(null);

    // New product form
    const [newProduct, setNewProduct] = useState({
        name: "",
        category: "3d-print" as Product["category"],
        price: "",
        description: "",
        imageFile: null as File | null,
        downloadUrl: "",
    });
    const [uploading, setUploading] = useState(false);

    // Wallet adjustment
    const [walletAdjustment, setWalletAdjustment] = useState({
        userId: "",
        amount: "",
        reason: "",
    });

    // Service image uploads
    const [serviceImageFiles, setServiceImageFiles] = useState<{
        [key: string]: File | null;
    }>({
        "3d-print": null,
        mug: null,
        tshirt: null,
        app: null,
    });

    // Redirect if not admin
    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    // Real-time orders listener - see new orders instantly
    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribe = onSnapshot(collection(db, "orders"), async (snapshot) => {
            const ordersData = await Promise.all(
                snapshot.docs.map(async (d) => {
                    const data = d.data();
                    const userDoc = await getDoc(doc(db, "users", data.userId));
                    const userData = userDoc.data();
                    return {
                        id: d.id,
                        ...data,
                        userEmail: userData?.email,
                        userPhone: userData?.phone,
                    };
                })
            );
            setOrders(ordersData as Order[]);
        }, (error) => {
            console.error("Error listening to orders:", error);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    // Real-time withdrawals listener - see new withdrawal requests instantly
    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribe = onSnapshot(collection(db, "withdrawals"), async (snapshot) => {
            const withdrawalsData = await Promise.all(
                snapshot.docs.map(async (d) => {
                    const data = d.data();
                    const userDoc = await getDoc(doc(db, "users", data.userId));
                    const userData = userDoc.data();
                    return {
                        id: d.id,
                        ...data,
                        userEmail: userData?.email,
                        userName: userData?.displayName,
                    };
                })
            );
            setWithdrawals(withdrawalsData as Withdrawal[]);
        }, (error) => {
            console.error("Error listening to withdrawals:", error);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    // Load other data (products, referrals, wallets, settings) - one-time with refresh option
    const loadOtherData = useCallback(async () => {
        if (!isAdmin) return;
        setRefreshingProducts(true);

        try {
            // Load products
            const productsSnap = await getDocs(collection(db, "products"));
            setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);

            // Load referrals with user info
            const referralsSnap = await getDocs(collection(db, "referrals"));
            const referralsWithInfo = await Promise.all(
                referralsSnap.docs.map(async (d) => {
                    const data = d.data();
                    const userDoc = await getDoc(doc(db, "users", data.referrerId));
                    const userData = userDoc.data();
                    return {
                        id: d.id,
                        ...data,
                        referrerEmail: userData?.email,
                        referrerPhone: userData?.phone,
                    };
                })
            );
            setReferrals(referralsWithInfo as Referral[]);

            // Load user wallets (users with wallet_balance > 0)
            const usersSnap = await getDocs(collection(db, "users"));
            const walletsData = usersSnap.docs
                .map(d => ({
                    id: d.id,
                    email: d.data().email || "",
                    displayName: d.data().displayName || "",
                    wallet_balance: d.data().wallet_balance || 0,
                    wallet_on_hold: d.data().wallet_on_hold || 0,
                    referralCode: d.data().referralCode || "",
                }))
                .filter(u => u.wallet_balance > 0 || u.wallet_on_hold > 0);
            setUserWallets(walletsData);

            // Load settings
            const settingsDoc = await getDoc(doc(db, "settings", "app"));
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() as AppSettings }));
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }

        setRefreshingProducts(false);
        setDataLoading(false);
    }, [isAdmin]);

    useEffect(() => {
        loadOtherData();
    }, [loadOtherData]);

    const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status });
            setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    const updateReferralStatus = async (referralId: string, status: Referral["status"]) => {
        try {
            await updateDoc(doc(db, "referrals", referralId), { status });
            setReferrals(referrals.map(r => r.id === referralId ? { ...r, status } : r));
        } catch (error) {
            console.error("Error updating referral:", error);
        }
    };

    const processWithdrawal = async (withdrawalId: string, action: "approve" | "reject") => {
        setProcessingWithdrawal(withdrawalId);
        try {
            const withdrawal = withdrawals.find(w => w.id === withdrawalId);
            if (!withdrawal) throw new Error("Withdrawal not found");

            if (action === "approve") {
                // Update user wallet: reduce both balance and on_hold
                const userRef = doc(db, "users", withdrawal.userId);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();

                if (userData) {
                    const newBalance = (userData.wallet_balance || 0) - withdrawal.amount;
                    const newOnHold = (userData.wallet_on_hold || 0) - withdrawal.amount;

                    await updateDoc(userRef, {
                        wallet_balance: Math.max(0, newBalance),
                        wallet_on_hold: Math.max(0, newOnHold),
                    });
                }

                // Log transaction
                await addDoc(collection(db, "wallet_transactions"), {
                    userId: withdrawal.userId,
                    type: "debit",
                    amount: withdrawal.amount,
                    reason: "withdrawal_approved",
                    withdrawalId: withdrawalId,
                    createdAt: serverTimestamp(),
                });
            } else {
                // Reject: release the on_hold amount
                const userRef = doc(db, "users", withdrawal.userId);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();

                if (userData) {
                    const newOnHold = (userData.wallet_on_hold || 0) - withdrawal.amount;
                    await updateDoc(userRef, {
                        wallet_on_hold: Math.max(0, newOnHold),
                    });
                }
            }

            // Update withdrawal status
            await updateDoc(doc(db, "withdrawals", withdrawalId), {
                status: action === "approve" ? "approved" : "rejected",
                processedAt: serverTimestamp(),
            });

            setWithdrawals(withdrawals.map(w =>
                w.id === withdrawalId ? { ...w, status: action === "approve" ? "approved" : "rejected" } : w
            ));
        } catch (error) {
            console.error("Error processing withdrawal:", error);
            alert("Failed to process withdrawal. Please try again.");
        }
        setProcessingWithdrawal(null);
    };

    const addProduct = async () => {
        if (!newProduct.name || !newProduct.price) return;
        setUploading(true);

        try {
            let imageUrl = "";

            // Upload image to Cloudinary if provided
            if (newProduct.imageFile) {
                const result = await uploadToCloudinary(newProduct.imageFile, "products");
                if (!result.success) {
                    alert(result.error || "Failed to upload image");
                    setUploading(false);
                    return;
                }
                imageUrl = result.url || "";
            }

            const productData = {
                name: newProduct.name,
                category: newProduct.category,
                price: newProduct.category === "app" ? 0 : (typeof newProduct.price === 'string' ? parseFloat(newProduct.price) || 0 : newProduct.price),
                description: newProduct.description,
                imageUrl,
                ...(newProduct.category === "app" && newProduct.downloadUrl ? { downloadUrl: newProduct.downloadUrl } : {}),
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "products"), productData);

            // Refresh products list
            await loadOtherData();

            // Reset form
            setNewProduct({ name: "", category: "3d-print", price: "", description: "", imageFile: null, downloadUrl: "" });
        } catch (error) {
            console.error("Error adding product:", error);
        }

        setUploading(false);
    };

    const deleteProduct = async (productId: string) => {
        if (!confirm("Delete this product?")) return;
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(products.filter(p => p.id !== productId));
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const uploadServiceImage = async (serviceType: "3d-print" | "mug" | "tshirt" | "app") => {
        const file = serviceImageFiles[serviceType];
        if (!file) return;

        setUploadingService(serviceType);
        try {
            const result = await uploadToCloudinary(file, "service-images");
            if (!result.success) {
                alert(result.error || "Failed to upload service image");
                setUploadingService(null);
                return;
            }

            const newServiceImages = {
                ...settings.serviceImages,
                [serviceType]: result.url,
            };

            setSettings({ ...settings, serviceImages: newServiceImages as AppSettings["serviceImages"] });
            setServiceImageFiles({ ...serviceImageFiles, [serviceType]: null });

            // Reset the file input
            const input = document.getElementById(`service-image-${serviceType}`) as HTMLInputElement;
            if (input) input.value = "";
        } catch (error) {
            console.error("Error uploading service image:", error);
            alert("Failed to upload service image. Check console for details.");
        }
        setUploadingService(null);
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "app"), settings);
        } catch (error) {
            console.error("Error saving settings:", error);
        }
        setSaving(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
            case "processing": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
            case "delivered": return "text-green-400 bg-green-500/10 border-green-500/20";
            case "paid": return "text-green-400 bg-green-500/10 border-green-500/20";
            default: return "text-stone-400 bg-stone-500/10";
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </main>
        );
    }

    if (!user || !isAdmin) return null;

    const tabs = [
        { id: "orders", label: "Orders", icon: Package, count: orders.filter(o => o.status !== "delivered").length },
        { id: "products", label: "Products", icon: ShoppingBag, count: products.length },
        { id: "referrals", label: "Referrals", icon: Users, count: referrals.filter(r => r.status === "pending").length },
        { id: "withdrawals", label: "Withdrawals", icon: Banknote, count: withdrawals.filter(w => w.status === "pending").length },
        { id: "wallets", label: "User Wallets", icon: Wallet, count: userWallets.length },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <main className="relative min-h-screen w-full bg-stone-950 text-white">
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />

            <div className="relative z-10">
                <Navbar />

                <div className="container mx-auto px-4 pt-32 pb-20 max-w-5xl">
                    <div className="flex items-center gap-3 mb-8">
                        <h1 className="text-3xl font-light">Admin Panel</h1>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">Admin</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-8 flex-wrap">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${activeTab === tab.id
                                    ? "bg-white text-black"
                                    : "bg-white/5 text-stone-400 hover:bg-white/10 border border-white/10"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-black/20" : "bg-purple-500/20 text-purple-300"
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {dataLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Orders Tab */}
                            {activeTab === "orders" && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-light">Manage Orders</h2>
                                    {orders.length === 0 ? (
                                        <GlassCard className="text-center py-12">
                                            <Package className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                            <p className="text-stone-500">No orders yet</p>
                                        </GlassCard>
                                    ) : (
                                        orders.map((order) => (
                                            <GlassCard key={order.id}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                                                        <p className="text-sm text-stone-500">
                                                            {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order["status"])}
                                                        className={`px-3 py-1 rounded-lg text-sm border cursor-pointer ${getStatusColor(order.status)} bg-transparent`}
                                                    >
                                                        <option value="pending" className="bg-stone-900">Pending</option>
                                                        <option value="processing" className="bg-stone-900">Processing</option>
                                                        <option value="delivered" className="bg-stone-900">Delivered</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1 mb-3">
                                                    {order.items.map((item, i) => (
                                                        <p key={i} className="text-sm text-stone-300">
                                                            {item.quantity}x {item.name} - ₹{item.price}
                                                        </p>
                                                    ))}
                                                </div>

                                                <div className="border-t border-white/5 pt-3 flex justify-between">
                                                    <span className="text-stone-500">Total</span>
                                                    <span className="font-medium text-lg">₹{order.total}</span>
                                                </div>
                                            </GlassCard>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Products Tab */}
                            {activeTab === "products" && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-light">Manage Products</h2>

                                    {/* Add Product Form */}
                                    <GlassCard className="border-purple-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Plus className="w-5 h-5" /> Add New Product
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="Product Name"
                                                value={newProduct.name}
                                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                            />
                                            <select
                                                value={newProduct.category}
                                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as Product["category"] })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                            >
                                                <option value="3d-print">3D Printing</option>
                                                <option value="mug">Mug</option>
                                                <option value="tshirt">T-Shirt</option>
                                                <option value="app">App / Platform</option>
                                            </select>
                                            {newProduct.category !== "app" && (
                                                <input
                                                    type="number"
                                                    placeholder="Price (₹)"
                                                    value={newProduct.price || ""}
                                                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                                    className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                                />
                                            )}
                                            {newProduct.category === "app" && (
                                                <input
                                                    type="url"
                                                    placeholder="Download URL (https://...)"
                                                    value={newProduct.downloadUrl}
                                                    onChange={(e) => setNewProduct({ ...newProduct, downloadUrl: e.target.value })}
                                                    className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none placeholder:text-cyan-300/40"
                                                />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setNewProduct({ ...newProduct, imageFile: e.target.files?.[0] || null })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500/20 file:text-purple-300 file:cursor-pointer"
                                            />
                                            <textarea
                                                placeholder="Description"
                                                value={newProduct.description}
                                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none md:col-span-2"
                                                rows={2}
                                            />
                                        </div>
                                        <button
                                            onClick={addProduct}
                                            disabled={uploading || !newProduct.name || (newProduct.category !== "app" && !newProduct.price)}
                                            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {uploading ? "Uploading..." : "Add Product"}
                                        </button>
                                    </GlassCard>

                                    {/* Product List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {products.map((product) => (
                                            <GlassCard key={product.id} className="relative">
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                <div className="aspect-video rounded-lg bg-stone-900 mb-3 overflow-hidden">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-stone-700">
                                                            No Image
                                                        </div>
                                                    )}
                                                </div>

                                                <h4 className="font-medium">{product.name}</h4>
                                                <p className="text-sm text-stone-500">{product.category}</p>
                                                <p className="text-lg mt-1">₹{product.price}</p>
                                            </GlassCard>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Referrals Tab */}
                            {activeTab === "referrals" && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-light">Manage Referrals</h2>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Total Pending</p>
                                            <p className="text-2xl font-light text-yellow-400">
                                                ₹{referrals.filter(r => r.status === "pending").reduce((s, r) => s + r.commission, 0)}
                                            </p>
                                        </GlassCard>
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Total Paid</p>
                                            <p className="text-2xl font-light text-green-400">
                                                ₹{referrals.filter(r => r.status === "paid").reduce((s, r) => s + r.commission, 0)}
                                            </p>
                                        </GlassCard>
                                    </div>

                                    {referrals.length === 0 ? (
                                        <GlassCard className="text-center py-12">
                                            <Users className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                            <p className="text-stone-500">No referrals yet</p>
                                        </GlassCard>
                                    ) : (
                                        referrals.map((ref) => (
                                            <GlassCard key={ref.id} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{ref.referrerEmail}</p>
                                                    {ref.referrerPhone && (
                                                        <p className="text-sm text-stone-500 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {ref.referrerPhone}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-stone-600">
                                                        {new Date(ref.createdAt.seconds * 1000).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-lg text-green-400">₹{ref.commission}</span>
                                                    {ref.status === "pending" ? (
                                                        <button
                                                            onClick={() => updateReferralStatus(ref.id, "paid")}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <Check className="w-4 h-4" /> Mark Paid
                                                        </button>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                                            Paid
                                                        </span>
                                                    )}
                                                </div>
                                            </GlassCard>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Withdrawals Tab */}
                            {activeTab === "withdrawals" && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-light">Withdrawal Requests</h2>

                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Pending</p>
                                            <p className="text-2xl font-light text-yellow-400">
                                                ₹{withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0)}
                                            </p>
                                        </GlassCard>
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Approved</p>
                                            <p className="text-2xl font-light text-green-400">
                                                ₹{withdrawals.filter(w => w.status === "approved").reduce((s, w) => s + w.amount, 0)}
                                            </p>
                                        </GlassCard>
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Rejected</p>
                                            <p className="text-2xl font-light text-red-400">
                                                ₹{withdrawals.filter(w => w.status === "rejected").reduce((s, w) => s + w.amount, 0)}
                                            </p>
                                        </GlassCard>
                                    </div>

                                    {withdrawals.length === 0 ? (
                                        <GlassCard className="text-center py-12">
                                            <Banknote className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                            <p className="text-stone-500">No withdrawal requests yet</p>
                                        </GlassCard>
                                    ) : (
                                        withdrawals
                                            .sort((a, b) => (a.status === "pending" ? -1 : 1))
                                            .map((w) => (
                                                <GlassCard key={w.id} className={w.status === "pending" ? "border-yellow-500/30" : ""}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <p className="font-medium">{w.userName || w.userEmail}</p>
                                                            <p className="text-sm text-stone-500">{w.userEmail}</p>
                                                            <p className="text-xs text-stone-600 mt-1">
                                                                {w.requestedAt?.seconds ? new Date(w.requestedAt.seconds * 1000).toLocaleString() : 'Unknown'}
                                                            </p>
                                                        </div>
                                                        <span className={`text-2xl font-light ${w.status === "pending" ? "text-yellow-400" : w.status === "approved" ? "text-green-400" : "text-red-400"}`}>
                                                            ₹{w.amount}
                                                        </span>
                                                    </div>

                                                    <div className="bg-stone-900/50 rounded-lg p-3 mb-4 space-y-1">
                                                        <p className="text-sm"><span className="text-stone-500">UPI ID:</span> <span className="text-cyan-300">{w.paymentDetails?.upiId || 'N/A'}</span></p>
                                                        <p className="text-sm"><span className="text-stone-500">Name:</span> {w.paymentDetails?.fullName || 'N/A'}</p>
                                                        <p className="text-sm"><span className="text-stone-500">Phone:</span> {w.paymentDetails?.phone || 'N/A'}</p>
                                                    </div>

                                                    {w.status === "pending" ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => processWithdrawal(w.id, "approve")}
                                                                disabled={processingWithdrawal === w.id}
                                                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                            >
                                                                {processingWithdrawal === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => processWithdrawal(w.id, "reject")}
                                                                disabled={processingWithdrawal === w.id}
                                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                            >
                                                                {processingWithdrawal === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className={`text-center py-2 rounded-lg text-sm ${w.status === "approved" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                                            {w.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                                                        </div>
                                                    )}

                                                    <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                                        <p className="text-xs text-yellow-300 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Verify UPI name matches: <strong>{w.paymentDetails?.fullName || 'N/A'}</strong>
                                                        </p>
                                                    </div>
                                                </GlassCard>
                                            ))
                                    )}
                                </div>
                            )}

                            {/* User Wallets Tab */}
                            {activeTab === "wallets" && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-light">User Wallets</h2>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">Total Balance</p>
                                            <p className="text-2xl font-light text-cyan-400">
                                                ₹{userWallets.reduce((s, u) => s + u.wallet_balance, 0)}
                                            </p>
                                        </GlassCard>
                                        <GlassCard>
                                            <p className="text-stone-500 text-sm">On Hold</p>
                                            <p className="text-2xl font-light text-yellow-400">
                                                ₹{userWallets.reduce((s, u) => s + u.wallet_on_hold, 0)}
                                            </p>
                                        </GlassCard>
                                    </div>

                                    {userWallets.length === 0 ? (
                                        <GlassCard className="text-center py-12">
                                            <Wallet className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                            <p className="text-stone-500">No users with wallet balance</p>
                                        </GlassCard>
                                    ) : (
                                        <div className="space-y-2">
                                            {userWallets.map((u) => (
                                                <GlassCard key={u.id} className="flex justify-between items-center py-3">
                                                    <div>
                                                        <p className="font-medium">{u.displayName || "No Name"}</p>
                                                        <p className="text-sm text-stone-500">{u.email}</p>
                                                        {u.referralCode && (
                                                            <code className="text-xs text-purple-400">ref:{u.referralCode}</code>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg text-cyan-400">₹{u.wallet_balance}</p>
                                                        {u.wallet_on_hold > 0 && (
                                                            <p className="text-xs text-yellow-400">₹{u.wallet_on_hold} on hold</p>
                                                        )}
                                                    </div>
                                                </GlassCard>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === "settings" && (
                                <div className="space-y-6 max-w-xl">
                                    <h2 className="text-xl font-light">Settings</h2>

                                    <GlassCard>
                                        <h3 className="text-lg font-light mb-4">Referral Commission</h3>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.commissionRate}
                                                onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                                                className="w-24 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-center text-lg focus:border-purple-500/50 focus:outline-none"
                                            />
                                            <span className="text-stone-400">% of order total</span>
                                        </div>
                                        <p className="text-xs text-stone-600 mt-2">
                                            Referrers earn this percentage when their referred friend makes their first purchase.
                                        </p>
                                    </GlassCard>

                                    <GlassCard>
                                        <h3 className="text-lg font-light mb-4">WhatsApp Number</h3>
                                        <input
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            value={settings.whatsappNumber}
                                            onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                                            className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500/50 focus:outline-none"
                                        />
                                        <p className="text-xs text-stone-600 mt-2">
                                            This number will be used for checkout and customer inquiries.
                                        </p>
                                    </GlassCard>

                                    {/* Cloudinary Settings */}
                                    <GlassCard className="border-pink-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Image className="w-5 h-5 text-pink-400" />
                                            Cloudinary Image Hosting
                                        </h3>
                                        <p className="text-xs text-stone-500 mb-4">
                                            Configure Cloudinary for reliable image uploads. Get credentials from{" "}
                                            <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                                                cloudinary.com/console
                                            </a>
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Cloud Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="your-cloud-name"
                                                    value={settings.cloudinaryCloudName || ""}
                                                    onChange={(e) => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-pink-500/50 focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Upload Preset (Unsigned)</label>
                                                <input
                                                    type="text"
                                                    placeholder="your-unsigned-preset"
                                                    value={settings.cloudinaryUploadPreset || ""}
                                                    onChange={(e) => setSettings({ ...settings, cloudinaryUploadPreset: e.target.value })}
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-pink-500/50 focus:outline-none"
                                                />
                                                <p className="text-xs text-stone-600 mt-1">
                                                    Create an unsigned upload preset in Cloudinary: Settings → Upload → Add upload preset → Signing Mode: Unsigned
                                                </p>
                                            </div>

                                            {settings.cloudinaryCloudName && settings.cloudinaryUploadPreset ? (
                                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                                    <Check className="w-4 h-4" />
                                                    Cloudinary configured
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Configure Cloudinary to enable image uploads
                                                </div>
                                            )}
                                        </div>
                                    </GlassCard>

                                    {/* Wallet Settings */}
                                    <GlassCard className="border-cyan-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-cyan-400" />
                                            Wallet Settings
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Minimum Withdrawal Amount (₹)</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={settings.minWithdrawal || 500}
                                                        onChange={(e) => setSettings({ ...settings, minWithdrawal: Number(e.target.value) })}
                                                        className="w-32 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-center focus:border-cyan-500/50 focus:outline-none"
                                                    />
                                                    <span className="text-stone-500 text-sm">Users cannot withdraw below this amount</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Max Wallet Usage at Checkout (%)</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={settings.maxWalletUsagePercent || 40}
                                                        onChange={(e) => setSettings({ ...settings, maxWalletUsagePercent: Number(e.target.value) })}
                                                        className="w-24 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-center focus:border-cyan-500/50 focus:outline-none"
                                                    />
                                                    <span className="text-stone-500 text-sm">% of cart total can be paid with wallet</span>
                                                </div>
                                            </div>
                                        </div>
                                    </GlassCard>

                                    {/* Service Card Backgrounds */}
                                    <GlassCard className="border-purple-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Image className="w-5 h-5 text-purple-400" />
                                            Service Card Backgrounds
                                        </h3>
                                        <p className="text-xs text-stone-500 mb-6">
                                            Upload background images for each service card on the home page.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* 3D Printing */}
                                            <div className="space-y-2">
                                                <label className="text-sm text-blue-300">3D Printing</label>
                                                <div
                                                    className="aspect-video rounded-lg bg-cover bg-center border border-white/10"
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.["3d-print"] || "/service_3d_printing.png"})` }}
                                                />
                                                <input
                                                    id="service-image-3d-print"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setServiceImageFiles({ ...serviceImageFiles, "3d-print": e.target.files?.[0] || null })}
                                                    className="w-full text-xs bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-blue-500/20 file:text-blue-300 file:text-xs file:cursor-pointer"
                                                />
                                                {serviceImageFiles["3d-print"] && (
                                                    <button
                                                        onClick={() => uploadServiceImage("3d-print")}
                                                        disabled={uploadingService === "3d-print"}
                                                        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {uploadingService === "3d-print" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                        {uploadingService === "3d-print" ? "Uploading..." : "Upload"}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Mugs */}
                                            <div className="space-y-2">
                                                <label className="text-sm text-orange-300">Custom Mugs</label>
                                                <div
                                                    className="aspect-video rounded-lg bg-cover bg-center border border-white/10"
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.mug || "/service_custom_mugs.png"})` }}
                                                />
                                                <input
                                                    id="service-image-mug"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setServiceImageFiles({ ...serviceImageFiles, mug: e.target.files?.[0] || null })}
                                                    className="w-full text-xs bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-orange-500/20 file:text-orange-300 file:text-xs file:cursor-pointer"
                                                />
                                                {serviceImageFiles.mug && (
                                                    <button
                                                        onClick={() => uploadServiceImage("mug")}
                                                        disabled={uploadingService === "mug"}
                                                        className="w-full px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {uploadingService === "mug" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                        {uploadingService === "mug" ? "Uploading..." : "Upload"}
                                                    </button>
                                                )}
                                            </div>

                                            {/* T-Shirts */}
                                            <div className="space-y-2">
                                                <label className="text-sm text-purple-300">T-Shirts</label>
                                                <div
                                                    className="aspect-video rounded-lg bg-cover bg-center border border-white/10"
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.tshirt || "/service_tshirts.png"})` }}
                                                />
                                                <input
                                                    id="service-image-tshirt"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setServiceImageFiles({ ...serviceImageFiles, tshirt: e.target.files?.[0] || null })}
                                                    className="w-full text-xs bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-purple-500/20 file:text-purple-300 file:text-xs file:cursor-pointer"
                                                />
                                                {serviceImageFiles.tshirt && (
                                                    <button
                                                        onClick={() => uploadServiceImage("tshirt")}
                                                        disabled={uploadingService === "tshirt"}
                                                        className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {uploadingService === "tshirt" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                        {uploadingService === "tshirt" ? "Uploading..." : "Upload"}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Apps & Platforms */}
                                            <div className="space-y-2">
                                                <label className="text-sm text-cyan-300">Apps & Platforms</label>
                                                <div
                                                    className="aspect-video rounded-lg bg-cover bg-center border border-white/10"
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.app || "/service_apps.png"})` }}
                                                />
                                                <input
                                                    id="service-image-app"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setServiceImageFiles({ ...serviceImageFiles, app: e.target.files?.[0] || null })}
                                                    className="w-full text-xs bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:text-xs file:cursor-pointer"
                                                />
                                                {serviceImageFiles.app && (
                                                    <button
                                                        onClick={() => uploadServiceImage("app")}
                                                        disabled={uploadingService === "app"}
                                                        className="w-full px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {uploadingService === "app" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                        {uploadingService === "app" ? "Uploading..." : "Upload"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>

                                    <button
                                        onClick={saveSettings}
                                        disabled={saving}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {saving ? "Saving..." : "Save Settings"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
