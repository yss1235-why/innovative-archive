"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getWalletData, formatCurrency } from "@/lib/wallet";
import { getReferralStats, ReferralStats } from "@/lib/referral";
import {
    Package, ShoppingCart, Users, User, Copy, Check,
    Phone, Save, ExternalLink, Loader2, Wallet, ArrowRight
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

    const [activeTab, setActiveTab] = useState<TabType>(
        (searchParams.get("tab") as TabType) || "orders"
    );
    const [orders, setOrders] = useState<Order[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [phone, setPhone] = useState("");
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    // Load user data
    useEffect(() => {
        if (userData) {
            setPhone(userData.phone || "");
        }
    }, [userData]);

    // Load orders and referrals
    useEffect(() => {
        async function loadData() {
            if (!user) return;
            setDataLoading(true);

            try {
                // Load orders
                const ordersQuery = query(
                    collection(db, "orders"),
                    where("userId", "==", user.uid)
                );
                const ordersSnap = await getDocs(ordersQuery);
                setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);

                // Load referrals
                const referralsQuery = query(
                    collection(db, "referrals"),
                    where("referrerId", "==", user.uid)
                );
                const referralsSnap = await getDocs(referralsQuery);
                setReferrals(referralsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
            } catch (error) {
                console.error("Error loading data:", error);
            }

            setDataLoading(false);
        }

        loadData();
    }, [user]);

    const copyReferralLink = () => {
        const link = `${window.location.origin}?ref=${userData?.referralCode}`;
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
                        <div>
                            <h2 className="text-xl font-light mb-4">Your Cart</h2>
                            <GlassCard className="text-center py-12">
                                <ShoppingCart className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                <p className="text-stone-500">Your cart is empty</p>
                                <a href="/products" className="text-purple-400 text-sm hover:underline mt-2 inline-block">
                                    Browse Products →
                                </a>
                            </GlassCard>
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
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${userData?.referralCode || ''}`}
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
