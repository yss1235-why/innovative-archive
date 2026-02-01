"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import {
    collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
    getDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
    Package, ShoppingBag, Users, Settings, Loader2,
    Check, X, Trash2, Plus, Upload, Save, Phone
} from "lucide-react";

type TabType = "orders" | "products" | "referrals" | "settings";

interface Order {
    id: string;
    userId: string;
    userEmail?: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    status: "pending" | "processing" | "delivered";
    createdAt: { seconds: number };
}

interface Product {
    id: string;
    name: string;
    category: "3d-print" | "mug" | "tshirt";
    price: number;
    imageUrl: string;
    description: string;
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

interface AppSettings {
    commissionPercent: number;
    whatsappNumber: string;
}

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, loading } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>("orders");
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [settings, setSettings] = useState<AppSettings>({ commissionPercent: 10, whatsappNumber: "" });
    const [dataLoading, setDataLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New product form
    const [newProduct, setNewProduct] = useState({
        name: "",
        category: "mug" as Product["category"],
        price: 0,
        description: "",
        imageFile: null as File | null,
    });
    const [uploading, setUploading] = useState(false);

    // Redirect if not admin
    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    // Load all data
    useEffect(() => {
        async function loadData() {
            if (!isAdmin) return;
            setDataLoading(true);

            try {
                // Load orders
                const ordersSnap = await getDocs(collection(db, "orders"));
                setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);

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

                // Load settings
                const settingsDoc = await getDoc(doc(db, "settings", "app"));
                if (settingsDoc.exists()) {
                    setSettings(settingsDoc.data() as AppSettings);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            }

            setDataLoading(false);
        }

        loadData();
    }, [isAdmin]);

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

    const addProduct = async () => {
        if (!newProduct.name || !newProduct.price) return;
        setUploading(true);

        try {
            let imageUrl = "";

            // Upload image if provided
            if (newProduct.imageFile) {
                const storageRef = ref(storage, `products/${Date.now()}_${newProduct.imageFile.name}`);
                await uploadBytes(storageRef, newProduct.imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            const productData = {
                name: newProduct.name,
                category: newProduct.category,
                price: newProduct.price,
                description: newProduct.description,
                imageUrl,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, "products"), productData);
            setProducts([...products, { id: docRef.id, ...productData }]);

            // Reset form
            setNewProduct({ name: "", category: "mug", price: 0, description: "", imageFile: null });
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
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Price (₹)"
                                                value={newProduct.price || ""}
                                                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                                className="bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
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
                                            disabled={uploading || !newProduct.name || !newProduct.price}
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
                                                value={settings.commissionPercent}
                                                onChange={(e) => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
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
