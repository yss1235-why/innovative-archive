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
import { updateOrderStatus as processOrderStatus } from "@/lib/orders";
import { getInvoiceByOrderId } from "@/lib/invoice";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import {
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    availableIcons,
    colorOptions,
    getIconComponent,
    type Category,
    type CategoryFormData,
} from "@/lib/categories";
import {
    Package, ShoppingBag, Users, Settings, Loader2,
    Check, X, Trash2, Plus, Upload, Save, Phone, Image,
    Wallet, Banknote, AlertCircle, RefreshCw, FolderTree, Edit2, Download
} from "lucide-react";

type TabType = "orders" | "products" | "categories" | "referrals" | "withdrawals" | "wallets" | "settings";

interface Order {
    id: string;
    userId: string;
    userEmail?: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    status: "pending" | "processing" | "shipped" | "completed" | "cancelled";
    createdAt: { seconds: number };
    userPhone?: string;
}

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
    gstRate?: number;   // GST percentage (0, 5, 12, 18)
    hsnCode?: string;   // HSN/SAC code
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
    status: "pending" | "paid" | "rejected";
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
    commissionEnabled: boolean;
    commissionRate: number;
    maxCommissionPurchases: number;
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
    commissionEnabled: true,
    commissionRate: 10,
    maxCommissionPurchases: 1,
    whatsappNumber: "",
    minWithdrawal: 100,
    withdrawalCooldownDays: 7,
    maxWalletUsagePercent: 40,
    serviceImages: {
        "3d-print": "/service_3d_printing.webp",
        mug: "/service_custom_mugs.webp",
        tshirt: "/service_tshirts.webp",
        app: "/service_apps.webp",
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
    const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

    // Handle invoice download for admin
    const handleDownloadInvoice = async (orderId: string) => {
        setDownloadingInvoice(orderId);
        try {
            const invoice = await getInvoiceByOrderId(orderId);
            if (invoice) {
                downloadInvoicePDF(invoice);
            } else {
                alert("Invoice not found. Invoice is generated when order is shipped or completed.");
            }
        } catch (error) {
            alert("Failed to download invoice. Please try again.");
        } finally {
            setDownloadingInvoice(null);
        }
    };

    // New product form
    const [newProduct, setNewProduct] = useState({
        name: "",
        category: "3d-print" as Product["category"],
        price: "",
        offerPrice: "" as string,  // Discounted/sale price
        priceType: "free" as "free" | "subscription",  // For app category
        description: "",
        imageFile: null as File | null,
        downloadUrl: "",
        gstRate: "18" as string,  // Default GST rate
        hsnCode: "" as string,    // HSN/SAC code
    });
    const [uploading, setUploading] = useState(false);

    // Edit product state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editProduct, setEditProduct] = useState<{
        name: string;
        category: string;
        price: string;
        offerPrice: string;
        priceType: "free" | "subscription";
        description: string;
        imageFile: File | null;
        downloadUrl: string;
        gstRate: string;
        hsnCode: string;
    }>({
        name: "",
        category: "",
        price: "",
        offerPrice: "",
        priceType: "free",
        description: "",
        imageFile: null,
        downloadUrl: "",
        gstRate: "18",
        hsnCode: "",
    });

    // Wallet adjustment
    const [walletAdjustment, setWalletAdjustment] = useState({
        userId: "",
        amount: "",
        reason: "",
    });

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState<CategoryFormData & { imageFile?: File | null }>({
        name: "",
        icon: "Package",
        color: "blue",
        description: "",
        displayOnHome: true,
        imageFile: null,
    });
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryData, setEditCategoryData] = useState<CategoryFormData & { imageFile?: File | null }>({
        name: "",
        icon: "Package",
        color: "blue",
        description: "",
        displayOnHome: true,
        imageFile: null,
    });
    const [savingCategory, setSavingCategory] = useState(false);
    const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);

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

            // Load categories
            const categoriesData = await getCategories();
            setCategories(categoriesData);
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
            // Use the orders utility which handles commission processing on completion
            await processOrderStatus(orderId, status);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));

            // Refresh referrals if order was completed (new commission may have been created)
            if (status === "completed") {
                loadOtherData();
            }
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to update order status. Please try again.");
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

                    // Log transaction (use transactionLogs collection for consistency)
                    await addDoc(collection(db, "transactionLogs"), {
                        userId: withdrawal.userId,
                        type: "withdrawal_debit",
                        amount: -withdrawal.amount,
                        balanceAfter: Math.max(0, newBalance),
                        description: `Withdrawal to ${withdrawal.paymentDetails?.upiId || "UPI"}`,
                        createdAt: serverTimestamp(),
                    });
                }
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
                status: action === "approve" ? "paid" : "rejected",
                processedAt: serverTimestamp(),
            });

            setWithdrawals(withdrawals.map(w =>
                w.id === withdrawalId ? { ...w, status: action === "approve" ? "paid" : "rejected" } : w
            ));
        } catch (error) {
            console.error("Error processing withdrawal:", error);
            alert("Failed to process withdrawal. Please try again.");
        }
        setProcessingWithdrawal(null);
    };

    const addProduct = async () => {
        // App category doesn't require price
        if (!newProduct.name || (newProduct.category !== "app" && !newProduct.price)) return;
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
                price: newProduct.category === "app"
                    ? (newProduct.priceType === "subscription" ? (typeof newProduct.price === 'string' ? parseFloat(newProduct.price) || 0 : newProduct.price) : 0)
                    : (typeof newProduct.price === 'string' ? parseFloat(newProduct.price) || 0 : newProduct.price),
                ...(newProduct.offerPrice ? { offerPrice: parseFloat(newProduct.offerPrice) || 0 } : {}),
                ...(newProduct.category === "app" ? { priceType: newProduct.priceType } : {}),
                description: newProduct.description,
                imageUrl,
                ...(newProduct.category === "app" && newProduct.downloadUrl ? { downloadUrl: newProduct.downloadUrl } : {}),
                gstRate: parseInt(newProduct.gstRate) || 18,
                hsnCode: newProduct.hsnCode || "",
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "products"), productData);

            // Refresh products list
            await loadOtherData();

            // Reset form - use first category from dynamic list or fallback
            const defaultCategory = categories.length > 0 ? categories[0].id : "3d-print";
            setNewProduct({ name: "", category: defaultCategory, price: "", offerPrice: "", priceType: "free", description: "", imageFile: null, downloadUrl: "", gstRate: "18", hsnCode: "" });
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

    const startEditProduct = (product: Product) => {
        setEditingProduct(product);
        setEditProduct({
            name: product.name,
            category: product.category,
            price: product.price?.toString() || "",
            offerPrice: product.offerPrice?.toString() || "",
            priceType: product.priceType || "free",
            description: product.description || "",
            imageFile: null,
            downloadUrl: product.downloadUrl || "",
            gstRate: product.gstRate?.toString() || "18",
            hsnCode: product.hsnCode || "",
        });
    };

    const updateProduct = async () => {
        if (!editingProduct) return;
        setUploading(true);

        try {
            let imageUrl = editingProduct.imageUrl;

            // Upload new image if provided
            if (editProduct.imageFile) {
                const result = await uploadToCloudinary(editProduct.imageFile, "products");
                if (!result.success) {
                    alert(result.error || "Failed to upload image");
                    setUploading(false);
                    return;
                }
                imageUrl = result.url || "";
            }

            const productData = {
                name: editProduct.name,
                category: editProduct.category,
                price: editProduct.category === "app"
                    ? (editProduct.priceType === "subscription" ? parseFloat(editProduct.price) || 0 : 0)
                    : parseFloat(editProduct.price) || 0,
                ...(editProduct.offerPrice ? { offerPrice: parseFloat(editProduct.offerPrice) || 0 } : { offerPrice: undefined }),
                ...(editProduct.category === "app" ? { priceType: editProduct.priceType } : {}),
                description: editProduct.description,
                imageUrl,
                ...(editProduct.category === "app" && editProduct.downloadUrl ? { downloadUrl: editProduct.downloadUrl } : {}),
                gstRate: parseInt(editProduct.gstRate) || 18,
                hsnCode: editProduct.hsnCode || "",
            };

            await updateDoc(doc(db, "products", editingProduct.id), productData);

            // Update local state
            setProducts(products.map(p =>
                p.id === editingProduct.id
                    ? { ...p, ...productData }
                    : p
            ));

            // Close modal
            setEditingProduct(null);
        } catch (error) {
            console.error("Error updating product:", error);
            alert("Failed to update product");
        }

        setUploading(false);
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
        { id: "orders", label: "Orders", icon: Package, count: orders.filter(o => o.status !== "completed" && o.status !== "cancelled").length },
        { id: "products", label: "Products", icon: ShoppingBag, count: products.length },
        { id: "categories", label: "Categories", icon: FolderTree, count: categories.length },
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
                                                        <option value="shipped" className="bg-stone-900">Shipped</option>
                                                        <option value="completed" className="bg-stone-900">Completed</option>
                                                        <option value="cancelled" className="bg-stone-900">Cancelled</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1 mb-3">
                                                    {order.items.map((item, i) => (
                                                        <p key={i} className="text-sm text-stone-300">
                                                            {item.quantity}x {item.name} - ₹{item.price}
                                                        </p>
                                                    ))}
                                                </div>

                                                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-stone-500">Total</span>
                                                        <span className="font-medium text-lg ml-2">₹{order.total}</span>
                                                    </div>
                                                    {(order.status === "shipped" || order.status === "completed") && (
                                                        <button
                                                            onClick={() => handleDownloadInvoice(order.id)}
                                                            disabled={downloadingInvoice === order.id}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                                        >
                                                            {downloadingInvoice === order.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Download className="w-4 h-4" />
                                                            )}
                                                            Invoice
                                                        </button>
                                                    )}
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
                                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                            {newProduct.category !== "app" && (
                                                <>
                                                    <input
                                                        type="number"
                                                        placeholder="Price (₹)"
                                                        value={newProduct.price || ""}
                                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Offer Price (₹) - Optional"
                                                        value={newProduct.offerPrice || ""}
                                                        onChange={(e) => setNewProduct({ ...newProduct, offerPrice: e.target.value })}
                                                        className="bg-stone-900 border border-orange-500/30 rounded-lg px-4 py-2 text-sm focus:border-orange-500/50 focus:outline-none placeholder:text-orange-300/40"
                                                    />
                                                </>
                                            )}
                                            {newProduct.category === "app" && (
                                                <>
                                                    <select
                                                        value={newProduct.priceType}
                                                        onChange={(e) => setNewProduct({ ...newProduct, priceType: e.target.value as "free" | "subscription", price: e.target.value === "free" ? "" : newProduct.price })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="free">Free</option>
                                                        <option value="subscription">Subscription (₹/month)</option>
                                                    </select>
                                                    {newProduct.priceType === "subscription" && (
                                                        <>
                                                            <input
                                                                type="number"
                                                                placeholder="Monthly Price (₹)"
                                                                value={newProduct.price || ""}
                                                                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Offer Price (₹/month) - Optional"
                                                                value={newProduct.offerPrice || ""}
                                                                onChange={(e) => setNewProduct({ ...newProduct, offerPrice: e.target.value })}
                                                                className="bg-stone-900 border border-orange-500/30 rounded-lg px-4 py-2 text-sm focus:border-orange-500/50 focus:outline-none placeholder:text-orange-300/40"
                                                            />
                                                        </>
                                                    )}
                                                    <input
                                                        type="url"
                                                        placeholder="Download URL (https://...)"
                                                        value={newProduct.downloadUrl}
                                                        onChange={(e) => setNewProduct({ ...newProduct, downloadUrl: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none placeholder:text-cyan-300/40"
                                                    />
                                                </>
                                            )}
                                            {/* GST Rate */}
                                            <select
                                                value={newProduct.gstRate}
                                                onChange={(e) => setNewProduct({ ...newProduct, gstRate: e.target.value })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none cursor-pointer"
                                            >
                                                <option value="0">GST: 0%</option>
                                                <option value="5">GST: 5%</option>
                                                <option value="12">GST: 12%</option>
                                                <option value="18">GST: 18%</option>
                                                <option value="28">GST: 28%</option>
                                            </select>
                                            {/* HSN Code */}
                                            <input
                                                type="text"
                                                placeholder="HSN/SAC Code (optional)"
                                                value={newProduct.hsnCode}
                                                onChange={(e) => setNewProduct({ ...newProduct, hsnCode: e.target.value })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none placeholder:text-stone-500"
                                            />
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
                                                <div className="absolute top-3 right-3 flex gap-2">
                                                    <button
                                                        onClick={() => startEditProduct(product)}
                                                        className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(product.id)}
                                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

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
                                                <div className="mt-1 flex items-center gap-2">
                                                    {product.offerPrice && product.offerPrice < product.price ? (
                                                        <>
                                                            <span className="text-lg font-medium text-green-400">₹{product.offerPrice}</span>
                                                            <span className="text-sm text-stone-500 line-through">₹{product.price}</span>
                                                            <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                                                                {Math.round(((product.price - product.offerPrice) / product.price) * 100)}% OFF
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-lg">₹{product.price}</span>
                                                    )}
                                                </div>
                                            </GlassCard>
                                        ))}
                                    </div>

                                    {/* Edit Product Modal */}
                                    {editingProduct && (
                                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                            <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-xl font-light">Edit Product</h3>
                                                    <button
                                                        onClick={() => setEditingProduct(null)}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Product Name"
                                                        value={editProduct.name}
                                                        onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                                    />
                                                    <select
                                                        value={editProduct.category}
                                                        onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                                    >
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>

                                                    {editProduct.category !== "app" && (
                                                        <>
                                                            <input
                                                                type="number"
                                                                placeholder="Price (₹)"
                                                                value={editProduct.price}
                                                                onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Offer Price (₹) - Optional"
                                                                value={editProduct.offerPrice}
                                                                onChange={(e) => setEditProduct({ ...editProduct, offerPrice: e.target.value })}
                                                                className="bg-stone-900 border border-orange-500/30 rounded-lg px-4 py-2 text-sm focus:border-orange-500/50 focus:outline-none placeholder:text-orange-300/40"
                                                            />
                                                        </>
                                                    )}

                                                    {editProduct.category === "app" && (
                                                        <>
                                                            <select
                                                                value={editProduct.priceType}
                                                                onChange={(e) => setEditProduct({ ...editProduct, priceType: e.target.value as "free" | "subscription", price: e.target.value === "free" ? "" : editProduct.price })}
                                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none cursor-pointer"
                                                            >
                                                                <option value="free">Free</option>
                                                                <option value="subscription">Subscription (₹/month)</option>
                                                            </select>
                                                            {editProduct.priceType === "subscription" && (
                                                                <>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Monthly Price (₹)"
                                                                        value={editProduct.price}
                                                                        onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Offer Price (₹/month) - Optional"
                                                                        value={editProduct.offerPrice}
                                                                        onChange={(e) => setEditProduct({ ...editProduct, offerPrice: e.target.value })}
                                                                        className="bg-stone-900 border border-orange-500/30 rounded-lg px-4 py-2 text-sm focus:border-orange-500/50 focus:outline-none placeholder:text-orange-300/40"
                                                                    />
                                                                </>
                                                            )}
                                                            <input
                                                                type="url"
                                                                placeholder="Download URL (https://...)"
                                                                value={editProduct.downloadUrl}
                                                                onChange={(e) => setEditProduct({ ...editProduct, downloadUrl: e.target.value })}
                                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none placeholder:text-cyan-300/40 md:col-span-2"
                                                            />
                                                        </>
                                                    )}

                                                    <select
                                                        value={editProduct.gstRate}
                                                        onChange={(e) => setEditProduct({ ...editProduct, gstRate: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="0">GST: 0%</option>
                                                        <option value="5">GST: 5%</option>
                                                        <option value="12">GST: 12%</option>
                                                        <option value="18">GST: 18%</option>
                                                        <option value="28">GST: 28%</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="HSN/SAC Code (optional)"
                                                        value={editProduct.hsnCode}
                                                        onChange={(e) => setEditProduct({ ...editProduct, hsnCode: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none placeholder:text-stone-500"
                                                    />

                                                    {/* Current Image Preview */}
                                                    {editingProduct.imageUrl && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-xs text-stone-500 mb-2">Current Image:</p>
                                                            <img src={editingProduct.imageUrl} alt="Current" className="h-20 w-auto rounded-lg object-cover" />
                                                        </div>
                                                    )}

                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setEditProduct({ ...editProduct, imageFile: e.target.files?.[0] || null })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500/20 file:text-purple-300 file:cursor-pointer md:col-span-2"
                                                    />

                                                    <textarea
                                                        placeholder="Description"
                                                        value={editProduct.description}
                                                        onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                                                        className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none md:col-span-2"
                                                        rows={3}
                                                    />
                                                </div>

                                                <div className="flex gap-3 mt-6">
                                                    <button
                                                        onClick={updateProduct}
                                                        disabled={uploading || !editProduct.name}
                                                        className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        {uploading ? "Saving..." : "Save Changes"}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingProduct(null)}
                                                        className="px-6 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </GlassCard>
                                        </div>
                                    )}
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
                                            <p className="text-stone-500 text-sm">Paid</p>
                                            <p className="text-2xl font-light text-green-400">
                                                ₹{withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0)}
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
                                                        <span className={`text-2xl font-light ${w.status === "pending" ? "text-yellow-400" : w.status === "paid" ? "text-green-400" : "text-red-400"}`}>
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
                                                        <div className={`text-center py-2 rounded-lg text-sm ${w.status === "paid" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                                            {w.status === "paid" ? "✓ Paid" : "✗ Rejected"}
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

                            {/* Categories Tab */}
                            {activeTab === "categories" && (
                                <div className="space-y-6 max-w-2xl">
                                    <h2 className="text-xl font-light">Manage Categories</h2>

                                    {/* Add New Category */}
                                    <GlassCard className="border-purple-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Plus className="w-5 h-5 text-purple-400" />
                                            Add New Category
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Category name"
                                                    value={newCategory.name}
                                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500/50 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Icon</label>
                                                <select
                                                    value={newCategory.icon}
                                                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                                >
                                                    {availableIcons.map(icon => (
                                                        <option key={icon} value={icon}>{icon}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm text-stone-500 mb-1 block">Color</label>
                                                <select
                                                    value={newCategory.color}
                                                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                                >
                                                    {colorOptions.map(color => (
                                                        <option key={color} value={color}>{color}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="mb-4">
                                            <label className="text-sm text-stone-500 mb-1 block">Description</label>
                                            <textarea
                                                placeholder="Short description for home page card"
                                                value={newCategory.description || ""}
                                                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                                className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500/50 focus:outline-none"
                                                rows={2}
                                            />
                                        </div>

                                        {/* Image Upload */}
                                        <div className="mb-4">
                                            <label className="text-sm text-stone-500 mb-1 block">Background Image</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setNewCategory({ ...newCategory, imageFile: e.target.files?.[0] || null })}
                                                className="w-full bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-purple-500/20 file:text-purple-300 file:cursor-pointer"
                                            />
                                            <p className="text-xs text-stone-600 mt-1">Optional. Used as card background on home page.</p>
                                        </div>

                                        {/* Display on Home Toggle */}
                                        <div className="flex items-center justify-between mb-4 bg-stone-900/50 rounded-lg p-3">
                                            <div>
                                                <p className="text-sm font-medium">Display on Home Page</p>
                                                <p className="text-xs text-stone-500">Show this category as a service card on home</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setNewCategory({ ...newCategory, displayOnHome: !newCategory.displayOnHome })}
                                                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${newCategory.displayOnHome ? "bg-green-600" : "bg-stone-700"}`}
                                            >
                                                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${newCategory.displayOnHome ? "right-0.5" : "left-0.5"}`} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!newCategory.name.trim()) return;
                                                setSavingCategory(true);
                                                try {
                                                    let imageUrl = "";

                                                    // Upload image if provided
                                                    if (newCategory.imageFile) {
                                                        setUploadingCategoryImage(true);
                                                        const result = await uploadToCloudinary(newCategory.imageFile, "categories");
                                                        if (result.success) {
                                                            imageUrl = result.url || "";
                                                        }
                                                        setUploadingCategoryImage(false);
                                                    }

                                                    await addCategory({
                                                        name: newCategory.name,
                                                        icon: newCategory.icon,
                                                        color: newCategory.color,
                                                        description: newCategory.description,
                                                        displayOnHome: newCategory.displayOnHome,
                                                        imageUrl,
                                                    });
                                                    const updated = await getCategories();
                                                    setCategories(updated);
                                                    setNewCategory({ name: "", icon: "Package", color: "blue", description: "", displayOnHome: true, imageFile: null });
                                                } catch (error) {
                                                    console.error("Error adding category:", error);
                                                    alert("Failed to add category");
                                                }
                                                setSavingCategory(false);
                                            }}
                                            disabled={savingCategory || uploadingCategoryImage || !newCategory.name.trim()}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {(savingCategory || uploadingCategoryImage) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            {uploadingCategoryImage ? "Uploading Image..." : savingCategory ? "Adding..." : "Add Category"}
                                        </button>
                                    </GlassCard>

                                    <div className="space-y-3">
                                        {categories.length === 0 ? (
                                            <GlassCard className="text-center py-8">
                                                <FolderTree className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                                <p className="text-stone-500">No categories yet. Add your first category above!</p>
                                            </GlassCard>
                                        ) : (
                                            categories.map((cat) => {
                                                const IconComponent = getIconComponent(cat.icon);
                                                const isEditing = editingCategory === cat.id;

                                                return (
                                                    <GlassCard key={cat.id} className={`${!cat.active ? "opacity-50" : ""}`}>
                                                        {isEditing ? (
                                                            <div className="space-y-4">
                                                                {/* Edit Form Row 1: Name, Icon, Color */}
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                    <input
                                                                        type="text"
                                                                        value={editCategoryData.name}
                                                                        onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                                                                        className="bg-stone-900 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500/50 focus:outline-none"
                                                                        placeholder="Name"
                                                                    />
                                                                    <select
                                                                        value={editCategoryData.icon}
                                                                        onChange={(e) => setEditCategoryData({ ...editCategoryData, icon: e.target.value })}
                                                                        className="bg-stone-900 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                                                    >
                                                                        {availableIcons.map(icon => (
                                                                            <option key={icon} value={icon}>{icon}</option>
                                                                        ))}
                                                                    </select>
                                                                    <select
                                                                        value={editCategoryData.color}
                                                                        onChange={(e) => setEditCategoryData({ ...editCategoryData, color: e.target.value })}
                                                                        className="bg-stone-900 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                                                                    >
                                                                        {colorOptions.map(color => (
                                                                            <option key={color} value={color}>{color}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {/* Description */}
                                                                <textarea
                                                                    value={editCategoryData.description || ""}
                                                                    onChange={(e) => setEditCategoryData({ ...editCategoryData, description: e.target.value })}
                                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500/50 focus:outline-none"
                                                                    placeholder="Description"
                                                                    rows={2}
                                                                />

                                                                {/* Image Upload */}
                                                                <div className="flex items-center gap-3">
                                                                    {(editCategoryData.imageUrl || cat.imageUrl) && (
                                                                        <div
                                                                            className="w-20 h-12 rounded bg-cover bg-center border border-white/10"
                                                                            style={{ backgroundImage: `url(${editCategoryData.imageUrl || cat.imageUrl})` }}
                                                                        />
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => setEditCategoryData({ ...editCategoryData, imageFile: e.target.files?.[0] || null })}
                                                                        className="flex-1 bg-stone-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500/20 file:text-purple-300 file:cursor-pointer"
                                                                    />
                                                                </div>

                                                                {/* Display on Home Toggle */}
                                                                <div className="flex items-center justify-between bg-stone-900/50 rounded-lg p-2">
                                                                    <span className="text-sm">Display on Home Page</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditCategoryData({ ...editCategoryData, displayOnHome: !editCategoryData.displayOnHome })}
                                                                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${editCategoryData.displayOnHome ? "bg-green-600" : "bg-stone-700"}`}
                                                                    >
                                                                        <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${editCategoryData.displayOnHome ? "right-0.5" : "left-0.5"}`} />
                                                                    </button>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            setSavingCategory(true);
                                                                            try {
                                                                                let imageUrl = editCategoryData.imageUrl;

                                                                                // Upload new image if provided
                                                                                if (editCategoryData.imageFile) {
                                                                                    setUploadingCategoryImage(true);
                                                                                    const result = await uploadToCloudinary(editCategoryData.imageFile, "categories");
                                                                                    if (result.success) {
                                                                                        imageUrl = result.url || "";
                                                                                    }
                                                                                    setUploadingCategoryImage(false);
                                                                                }

                                                                                await updateCategory(cat.id, {
                                                                                    name: editCategoryData.name,
                                                                                    icon: editCategoryData.icon,
                                                                                    color: editCategoryData.color,
                                                                                    description: editCategoryData.description,
                                                                                    displayOnHome: editCategoryData.displayOnHome,
                                                                                    imageUrl,
                                                                                });
                                                                                const updated = await getCategories();
                                                                                setCategories(updated);
                                                                                setEditingCategory(null);
                                                                            } catch (error) {
                                                                                console.error("Error updating category:", error);
                                                                                alert("Failed to update category");
                                                                            }
                                                                            setSavingCategory(false);
                                                                        }}
                                                                        disabled={savingCategory || uploadingCategoryImage}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        {(savingCategory || uploadingCategoryImage) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                        {uploadingCategoryImage ? "Uploading..." : "Save"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingCategory(null)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-stone-700 text-white rounded-lg text-sm hover:bg-stone-600 cursor-pointer"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start gap-4">
                                                                {/* Image Preview */}
                                                                {cat.imageUrl ? (
                                                                    <div
                                                                        className="w-24 h-16 rounded-lg bg-cover bg-center border border-white/10 flex-shrink-0"
                                                                        style={{ backgroundImage: `url(${cat.imageUrl})` }}
                                                                    />
                                                                ) : (
                                                                    <div className={`w-12 h-12 rounded-lg bg-${cat.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                                                                        <IconComponent className={`w-6 h-6 text-${cat.color}-400`} />
                                                                    </div>
                                                                )}

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="font-medium">{cat.name}</p>
                                                                        {cat.displayOnHome && (
                                                                            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Home</span>
                                                                        )}
                                                                    </div>
                                                                    {cat.description && (
                                                                        <p className="text-sm text-stone-400 mb-1 line-clamp-1">{cat.description}</p>
                                                                    )}
                                                                    <p className="text-xs text-stone-500">{cat.id} • {cat.icon} • {cat.color}</p>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {/* Active toggle */}
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updateCategory(cat.id, { active: !cat.active });
                                                                                const updated = await getCategories();
                                                                                setCategories(updated);
                                                                            } catch (error) {
                                                                                console.error("Error toggling category:", error);
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 rounded text-xs cursor-pointer ${cat.active ? "bg-green-500/20 text-green-400" : "bg-stone-700 text-stone-400"}`}
                                                                    >
                                                                        {cat.active ? "Active" : "Inactive"}
                                                                    </button>
                                                                    {/* Edit */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCategory(cat.id);
                                                                            setEditCategoryData({
                                                                                name: cat.name,
                                                                                icon: cat.icon,
                                                                                color: cat.color,
                                                                                description: cat.description || "",
                                                                                displayOnHome: cat.displayOnHome ?? true,
                                                                                imageUrl: cat.imageUrl || "",
                                                                                imageFile: null,
                                                                            });
                                                                        }}
                                                                        className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 cursor-pointer"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    {/* Delete */}
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm(`Delete category "${cat.name}"? Products in this category will keep their current category value.`)) return;
                                                                            try {
                                                                                await deleteCategory(cat.id);
                                                                                const updated = await getCategories();
                                                                                setCategories(updated);
                                                                            } catch (error) {
                                                                                console.error("Error deleting category:", error);
                                                                                alert("Failed to delete category");
                                                                            }
                                                                        }}
                                                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </GlassCard>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === "settings" && (
                                <div className="space-y-6 max-w-xl">
                                    <h2 className="text-xl font-light">Settings</h2>

                                    <GlassCard className="border-green-500/20">
                                        <h3 className="text-lg font-light mb-4 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-green-400" />
                                            Commission Settings
                                        </h3>

                                        <div className="space-y-6">
                                            {/* Enable/Disable Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">Enable Commission System</p>
                                                    <p className="text-xs text-stone-500">Turn referral commissions on or off</p>
                                                </div>
                                                <button
                                                    onClick={() => setSettings({ ...settings, commissionEnabled: !settings.commissionEnabled })}
                                                    className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${settings.commissionEnabled ? "bg-green-600" : "bg-stone-700"}`}
                                                >
                                                    <div className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-all ${settings.commissionEnabled ? "right-1" : "left-1"}`} />
                                                </button>
                                            </div>

                                            {/* Commission Rate */}
                                            <div className={settings.commissionEnabled ? "" : "opacity-50 pointer-events-none"}>
                                                <label className="text-sm text-stone-500 mb-1 block">Commission Rate</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={settings.commissionRate}
                                                        onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                                                        className="w-24 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-center text-lg focus:border-green-500/50 focus:outline-none"
                                                    />
                                                    <span className="text-stone-400">% of order total</span>
                                                </div>
                                            </div>

                                            {/* Max Commission Purchases */}
                                            <div className={settings.commissionEnabled ? "" : "opacity-50 pointer-events-none"}>
                                                <label className="text-sm text-stone-500 mb-1 block">Max Commission Purchases</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={settings.maxCommissionPurchases}
                                                        onChange={(e) => setSettings({ ...settings, maxCommissionPurchases: Number(e.target.value) })}
                                                        className="w-24 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-center text-lg focus:border-green-500/50 focus:outline-none"
                                                    />
                                                    <span className="text-stone-400">purchases earn commission</span>
                                                </div>
                                                <p className="text-xs text-stone-600 mt-2">
                                                    Set to 0 for unlimited. Set to 1 for first purchase only.
                                                </p>
                                            </div>
                                        </div>
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
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.["3d-print"] || "/service_3d_printing.webp"})` }}
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
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.mug || "/service_custom_mugs.webp"})` }}
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
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.tshirt || "/service_tshirts.webp"})` }}
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
                                                    style={{ backgroundImage: `url(${settings.serviceImages?.app || "/service_apps.webp"})` }}
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
