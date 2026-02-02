"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getReferralLink, getReferralStats, ReferralStats } from "@/lib/referral";
import {
    Copy,
    Check,
    Users,
    ShoppingBag,
    Wallet as WalletIcon,
    Clock,
    ArrowLeft,
    Share2
} from "lucide-react";
import Link from "next/link";

export default function ReferralsPage() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [copied, setCopied] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        setLoadingStats(true);
        const data = await getReferralStats(user.uid);
        setStats(data);
        setLoadingStats(false);
    };

    const referralLink = userData?.referralCode
        ? getReferralLink(userData.referralCode)
        : "";

    const copyToClipboard = async () => {
        if (!referralLink) return;
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLink = async () => {
        if (!referralLink) return;
        if (navigator.share) {
            await navigator.share({
                title: "Join Innovative Archive",
                text: "Check out this amazing store! Use my referral link:",
                url: referralLink,
            });
        } else {
            copyToClipboard();
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="animate-pulse text-stone-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">My Referrals</h1>
                </div>

                {/* Referral Link Card */}
                <div className="bg-stone-900 rounded-2xl p-6 mb-6 border border-stone-800">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-cyan-400" />
                        Your Referral Link
                    </h2>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={referralLink}
                            readOnly
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-300 truncate"
                        />
                        <button
                            onClick={copyToClipboard}
                            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${copied
                                    ? "bg-green-600 text-white"
                                    : "bg-stone-800 hover:bg-stone-700 text-stone-300"
                                }`}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>

                    <button
                        onClick={shareLink}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                    >
                        Share Link
                    </button>

                    <p className="text-stone-500 text-sm mt-4 text-center">
                        Share this link with friends. When they make their <span className="text-cyan-400">first purchase</span>, you earn a commission!
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span className="text-stone-400 text-sm">Referred</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {loadingStats ? "—" : stats?.totalReferred || 0}
                        </p>
                    </div>

                    <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingBag className="w-5 h-5 text-green-400" />
                            <span className="text-stone-400 text-sm">Purchased</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {loadingStats ? "—" : stats?.totalPurchased || 0}
                        </p>
                    </div>

                    <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                        <div className="flex items-center gap-3 mb-2">
                            <WalletIcon className="w-5 h-5 text-yellow-400" />
                            <span className="text-stone-400 text-sm">Total Earned</span>
                        </div>
                        <p className="text-2xl font-bold">
                            ₹{loadingStats ? "—" : stats?.totalEarned || 0}
                        </p>
                    </div>

                    <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-5 h-5 text-orange-400" />
                            <span className="text-stone-400 text-sm">Pending</span>
                        </div>
                        <p className="text-2xl font-bold">
                            ₹{loadingStats ? "—" : stats?.pendingCommissions || 0}
                        </p>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-stone-900/50 rounded-xl p-5 border border-stone-800">
                    <h3 className="font-semibold mb-3">How it works</h3>
                    <ul className="space-y-2 text-sm text-stone-400">
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">1.</span>
                            Share your unique referral link with friends
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">2.</span>
                            When they sign up and make their <span className="text-cyan-400">first purchase</span>, you earn commission
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">3.</span>
                            Commission is added to your wallet after admin approval
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">4.</span>
                            Use wallet balance at checkout or withdraw to UPI
                        </li>
                    </ul>

                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-amber-400 text-sm">
                            ⚠️ Only the <strong>first purchase</strong> from each referral counts for commission.
                        </p>
                    </div>
                </div>

                {/* Link to Wallet */}
                <Link
                    href="/dashboard/wallet"
                    className="mt-6 block w-full py-4 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-center font-medium transition-colors"
                >
                    View Your Wallet →
                </Link>
            </div>
        </div>
    );
}
