"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getWalletData, formatCurrency } from "@/lib/wallet";
import {
    Package, ShoppingCart, Users, User, Copy, Check,
    Phone, Save, ExternalLink, Loader2, Wallet, ArrowRight, RefreshCw, Trash2, Minus, Plus
} from "lucide-react";

type TabType = "orders" | "cart" | "referrals" | "profile";

interface Order {
    id: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    status: "pending" | "processing" | "delivered";
    createdAt: { seconds: number };
}

interface Referral {
    id: string;
    refereeId: string;
    commission: number;
    status: "pending" | "paid";
    createdAt: { seconds: number };
}

// Wrapper component with Suspense
export default function DashboardPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </main>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, userData, loading } = useAuth();
    const { items: cartItems, updateQuantity, removeFromCart, total: cartTotal } = useCart();

    const [activeTab, setActiveTab] = useState<TabType>(
        (searchParams.get("tab") as TabType) || "orders"
    );
    const [orders, setOrders] = useState<Order[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [phone, setPhone] = useState("");
    const [copied, setCopied] = useState(false);
    const [referralLinkValue, setReferralLinkValue] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshingReferrals, setRefreshingReferrals] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    // Load user data and set referral link (client-side only to prevent hydration mismatch)
    useEffect(() => {
        if (userData) {
            setPhone(userData.phone || "");
            if (userData.referralCode) {
                setReferralLinkValue(`${window.location.origin}?ref=${userData.referralCode}`);
            }
        }
    }, [userData]);

    // Real-time orders listener - updates immediately when admin changes status
    useEffect(() => {
        if (!user) {
            setOrders([]);
            return;
        }

        setDataLoading(true);
        const ordersQuery = query(
            collection(db, "orders"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
            setDataLoading(false);
        }, (error) => {
            console.error("Error listening to orders:", error);
            setDataLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Load referrals (one-time fetch with manual refresh option)
    const loadReferrals = useCallback(async () => {
        if (!user) return;
        setRefreshingReferrals(true);

        try {
            const referralsQuery = query(
                collection(db, "referrals"),
                where("referrerId", "==", user.uid)
            );
            const referralsSnap = await getDocs(referralsQuery);
            setReferrals(referralsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
        } catch (error) {
            console.error("Error loading referrals:", error);
        }

        setRefreshingReferrals(false);
    }, [user]);

    useEffect(() => {
        loadReferrals();
    }, [loadReferrals]);

    const copyReferralLink = () => {
        if (!userData?.referralCode) return;
        const link = `${window.location.origin}?ref=${userData.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const savePhone = async () => {
        if (!user || !phone) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), { phone });
        } catch (error) {
            console.error("Error saving phone:", error);
        }
        setSaving(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "text-yellow-400 bg-yellow-500/10";
            case "processing": return "text-blue-400 bg-blue-500/10";
            case "delivered": return "text-green-400 bg-green-500/10";
            case "paid": return "text-green-400 bg-green-500/10";
            default: return "text-stone-400 bg-stone-500/10";
        }
    };

    const totalEarnings = referrals.reduce((sum, r) => sum + r.commission, 0);
    const paidEarnings = referrals.filter(r => r.status === "paid").reduce((sum, r) => sum + r.commission, 0);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </main>
        );
    }

    if (!user) return null;

    const tabs = [
        { id: "orders", label: "Orders", icon: Package },
        { id: "cart", label: "Cart", icon: ShoppingCart },
        { id: "referrals", label: "Referrals", icon: Users },
        { id: "profile", label: "Profile", icon: User },
    ];

    return (
        <main className="relative min-h-screen w-full bg-stone-950 text-white">
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />

            <div className="relative z-10">
                <Navbar />

                <div className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
                    <h1 className="text-3xl font-light mb-2">Dashboard</h1>
                    <p className="text-stone-500 mb-6">Welcome back, {user.displayName}</p>

                    {/* Quick Access Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {/* Wallet Card */}
                        <Link href="/dashboard/wallet">
                            <GlassCard className="hover:border-cyan-500/30 transition-colors cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-stone-500">Wallet Balance</p>
                                            <p className="text-xl font-semibold text-cyan-400">
                                                {formatCurrency(userData?.wallet_balance || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-stone-600" />
                                </div>
                            </GlassCard>
                        </Link>

                        {/* Referrals Card */}
                        <Link href="/dashboard/referrals">
                            <GlassCard className="hover:border-green-500/30 transition-colors cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-stone-500">Refer & Earn</p>
                                            <p className="text-sm text-green-400">
                                                Share your link →
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-stone-600" />
                                </div>
                            </GlassCard>
                        </Link>
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
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "orders" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-light mb-4">Your Orders</h2>
                            {dataLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                </div>
                            ) : orders.length === 0 ? (
                                <GlassCard className="text-center py-12">
                                    <Package className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                    <p className="text-stone-500">No orders yet</p>
                                    <a href="/products" className="text-purple-400 text-sm hover:underline mt-2 inline-block">
                                        Browse Products →
                                    </a>
                                </GlassCard>
                            ) : (
                                orders.map((order) => (
                                    <GlassCard key={order.id}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-xs text-stone-500">Order #{order.id.slice(0, 8)}</p>
                                                <p className="text-sm text-stone-400">
                                                    {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs capitalize ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            {order.items.map((item, i) => (
                                                <p key={i} className="text-sm">
                                                    {item.quantity}x {item.name} - ₹{item.price}
                                                </p>
                                            ))}
                                        </div>
                                        <div className="border-t border-white/5 pt-3 flex justify-between">
                                            <span className="text-stone-500">Total</span>
                                            <span className="font-medium">₹{order.total}</span>
                                        </div>
                                    </GlassCard>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "cart" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-light mb-4">Your Cart</h2>
                            {cartItems.length === 0 ? (
                                <GlassCard className="text-center py-12">
                                    <ShoppingCart className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                    <p className="text-stone-500">Your cart is empty</p>
                                    <a href="/products" className="text-purple-400 text-sm hover:underline mt-2 inline-block">
                                        Browse Products →
                                    </a>
                                </GlassCard>
                            ) : (
                                <>
                                    {/* Cart Items */}
                                    <div className="space-y-3">
                                        {cartItems.map((item) => (
                                            <GlassCard key={item.id} className="flex items-center gap-4">
                                                {/* Item Image */}
                                                <div className="w-16 h-16 rounded-lg bg-stone-800 flex-shrink-0 overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ShoppingCart className="w-6 h-6 text-stone-600" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Item Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium truncate">{item.name}</h4>
                                                    <p className="text-sm text-stone-500">₹{item.price} each</p>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Item Total & Remove */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-medium">₹{item.price * item.quantity}</p>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </GlassCard>
                                        ))}
                                    </div>

                                    {/* Cart Total */}
                                    <GlassCard className="border-purple-500/20">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-lg text-stone-400">Total</span>
                                            <span className="text-2xl font-light text-purple-400">₹{cartTotal}</span>
                                        </div>
                                        <a
                                            href={`https://wa.me/919876543210?text=Hi! I'd like to order:%0A${cartItems.map(item => `- ${item.quantity}x ${item.name} (₹${item.price * item.quantity})`).join('%0A')}%0A%0ATotal: ₹${cartTotal}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            Checkout via WhatsApp
                                        </a>
                                    </GlassCard>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "referrals" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-light">Refer & Earn</h2>

                            {/* Referral Link */}
                            <GlassCard className="border-green-500/20">
                                <h3 className="text-lg font-light mb-2">Your Referral Link</h3>
                                <p className="text-stone-500 text-sm mb-4">
                                    Share this link with friends. When they make their first purchase, you earn commission!
                                </p>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={referralLinkValue || 'Loading...'}
                                        className="flex-1 bg-stone-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-green-300"
                                    />
                                    <button
                                        onClick={copyReferralLink}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </GlassCard>

                            {/* Earnings Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <GlassCard>
                                    <p className="text-stone-500 text-sm mb-1">Total Earnings</p>
                                    <p className="text-2xl font-light text-green-400">₹{totalEarnings}</p>
                                </GlassCard>
                                <GlassCard>
                                    <p className="text-stone-500 text-sm mb-1">Paid Out</p>
                                    <p className="text-2xl font-light">₹{paidEarnings}</p>
                                </GlassCard>
                            </div>

                            {/* Referral List */}
                            <div>
                                <h3 className="text-lg font-light mb-3">Your Referrals</h3>
                                {referrals.length === 0 ? (
                                    <GlassCard className="text-center py-8">
                                        <Users className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                                        <p className="text-stone-500 text-sm">No referrals yet. Start sharing your link!</p>
                                    </GlassCard>
                                ) : (
                                    <div className="space-y-2">
                                        {referrals.map((ref) => (
                                            <GlassCard key={ref.id} className="flex justify-between items-center py-3">
                                                <div>
                                                    <p className="text-sm">Referral #{ref.id.slice(0, 6)}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {new Date(ref.createdAt.seconds * 1000).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-green-400">+₹{ref.commission}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ref.status)}`}>
                                                        {ref.status}
                                                    </span>
                                                </div>
                                            </GlassCard>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "profile" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-light">Profile</h2>

                            <GlassCard>
                                <div className="flex items-center gap-4 mb-6">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <User className="w-8 h-8 text-purple-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg">{user.displayName}</h3>
                                        <p className="text-stone-500 text-sm">{user.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-stone-500 mb-1 block">
                                            Phone Number (required for referral payouts)
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full bg-stone-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-purple-500/50 focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={savePhone}
                                                disabled={saving}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-sm text-stone-500 mb-1">Referral Code</p>
                                        <code className="text-purple-300">{userData?.referralCode}</code>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
