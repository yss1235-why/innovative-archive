"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, addDoc, collection, updateDoc, Timestamp } from "firebase/firestore";
import {
    getWalletData,
    checkWithdrawalEligibility,
    getTransactionHistory,
    getWithdrawalHistory,
    getReferralSettings,
    formatCurrency,
    formatDate,
    TransactionLog,
    WithdrawalRecord,
} from "@/lib/wallet";
import {
    Wallet as WalletIcon,
    ArrowLeft,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    CreditCard,
    History,
    Send,
} from "lucide-react";
import Link from "next/link";

export default function WalletPage() {
    const { user, userData, loading, refreshUserData } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"overview" | "withdraw" | "history">("overview");
    const [transactions, setTransactions] = useState<TransactionLog[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Withdrawal form
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);

    const [paymentDetails, setPaymentDetails] = useState({
        fullName: "",
        phone: "",
        upiId: "",
    });
    const [savingDetails, setSavingDetails] = useState(false);
    const [settings, setSettings] = useState({ minWithdrawal: 100, maxWalletUsagePercent: 40 });

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && userData) {
            loadData();
            // Fetch settings
            getReferralSettings().then(setSettings);
            // Pre-fill payment details
            if (userData.paymentDetails) {
                setPaymentDetails({
                    fullName: userData.paymentDetails.fullName || "",
                    phone: userData.paymentDetails.phone || "",
                    upiId: userData.paymentDetails.upiId || "",
                });
            }
        }
    }, [user, userData]);

    const loadData = async () => {
        if (!user) return;
        setLoadingData(true);
        const [txns, wds] = await Promise.all([
            getTransactionHistory(user.uid),
            getWithdrawalHistory(user.uid),
        ]);
        setTransactions(txns);
        setWithdrawals(wds);
        setLoadingData(false);
    };

    const wallet = userData ? getWalletData(userData) : { balance: 0, onHold: 0, available: 0 };

    const savePaymentDetails = async () => {
        if (!user || !userData) return;

        if (!paymentDetails.fullName || !paymentDetails.phone || !paymentDetails.upiId) {
            alert("Please fill in all payment details");
            return;
        }

        // Check name change limit
        const currentName = userData.paymentDetails?.fullName || "";
        const nameChangeCount = userData.nameChangeCount || 0;

        if (currentName && currentName !== paymentDetails.fullName && nameChangeCount >= 2) {
            alert("You can only change your name 2 times. Please contact support for further changes.");
            return;
        }

        setSavingDetails(true);
        try {
            const updates: Record<string, unknown> = {
                paymentDetails: {
                    fullName: paymentDetails.fullName,
                    phone: paymentDetails.phone,
                    upiId: paymentDetails.upiId,
                },
            };

            // Increment name change count if name changed
            if (currentName && currentName !== paymentDetails.fullName) {
                updates.nameChangeCount = nameChangeCount + 1;
            }

            await updateDoc(doc(db, "users", user.uid), updates);
            await refreshUserData();
            alert("Payment details saved successfully!");
        } catch (error) {
            console.error("Error saving payment details:", error);
            alert("Failed to save payment details");
        }
        setSavingDetails(false);
    };

    const handleWithdraw = async () => {
        if (!user || !userData) return;

        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setWithdrawError("Please enter a valid amount");
            return;
        }

        setWithdrawing(true);
        setWithdrawError("");

        try {
            // Check eligibility
            const eligibility = await checkWithdrawalEligibility(user.uid, userData, amount);
            if (!eligibility.canWithdraw) {
                setWithdrawError(eligibility.reason || "Cannot process withdrawal");
                setWithdrawing(false);
                return;
            }

            // Create withdrawal request
            await addDoc(collection(db, "withdrawals"), {
                userId: user.uid,
                userEmail: userData.email,
                fullName: userData.paymentDetails?.fullName,
                phone: userData.paymentDetails?.phone,
                upiId: userData.paymentDetails?.upiId,
                amount: amount,
                status: "pending",
                requestedAt: Timestamp.now(),
            });

            // Update user's on-hold balance and last withdrawal request
            await updateDoc(doc(db, "users", user.uid), {
                wallet_on_hold: (userData.wallet_on_hold || 0) + amount,
                lastWithdrawalRequest: Timestamp.now(),
            });

            setWithdrawSuccess(true);
            setWithdrawAmount("");
            await refreshUserData();
            await loadData();
        } catch (error) {
            console.error("Error creating withdrawal:", error);
            setWithdrawError("Failed to create withdrawal request");
        }
        setWithdrawing(false);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="animate-pulse text-stone-500">Loading...</div>
            </div>
        );
    }

    const pendingWithdrawal = withdrawals.find(w => w.status === "pending");

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
                    <h1 className="text-2xl font-bold">My Wallet</h1>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <WalletIcon className="w-6 h-6" />
                        <span className="text-white/80">Total Balance</span>
                    </div>
                    <p className="text-4xl font-bold mb-4">{formatCurrency(wallet.balance)}</p>

                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-white/60">Available</span>
                            <p className="font-semibold">{formatCurrency(wallet.available)}</p>
                        </div>
                        {wallet.onHold > 0 && (
                            <div>
                                <span className="text-white/60">On Hold</span>
                                <p className="font-semibold text-yellow-300">
                                    {formatCurrency(wallet.onHold)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Withdrawal Alert */}
                {pendingWithdrawal && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-yellow-400" />
                            <div>
                                <p className="font-medium text-yellow-400">Pending Withdrawal</p>
                                <p className="text-sm text-stone-400">
                                    {formatCurrency(pendingWithdrawal.amount)} → {pendingWithdrawal.upiId}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-stone-900 p-1 rounded-xl">
                    {[
                        { id: "overview" as const, label: "Overview", icon: WalletIcon },
                        { id: "withdraw" as const, label: "Withdraw", icon: Send },
                        { id: "history" as const, label: "History", icon: History },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? "bg-stone-800 text-white"
                                : "text-stone-500 hover:text-stone-300"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === "overview" && (
                    <div className="space-y-4">
                        <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                            <h3 className="font-semibold mb-3">How to use your wallet</h3>
                            <ul className="space-y-2 text-sm text-stone-400">
                                <li className="flex items-start gap-2">
                                    <CreditCard className="w-4 h-4 text-cyan-400 mt-0.5" />
                                    Use up to <span className="text-cyan-400">{settings.maxWalletUsagePercent}%</span> of your cart total at checkout
                                </li>
                                <li className="flex items-start gap-2">
                                    <Send className="w-4 h-4 text-green-400 mt-0.5" />
                                    Withdraw minimum <span className="text-green-400">₹{settings.minWithdrawal}</span> to your UPI
                                </li>
                                <li className="flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-yellow-400 mt-0.5" />
                                    Withdrawals are processed <span className="text-yellow-400">monthly</span> by admin
                                </li>
                            </ul>
                        </div>

                        <Link
                            href="/dashboard/referrals"
                            className="block bg-stone-900 rounded-xl p-5 border border-stone-800 hover:bg-stone-800 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Earn More</h3>
                                    <p className="text-sm text-stone-400">Share your referral link</p>
                                </div>
                                <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                            </div>
                        </Link>
                    </div>
                )}

                {activeTab === "withdraw" && (
                    <div className="space-y-6">
                        {/* Payment Details */}
                        <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                            <h3 className="font-semibold mb-4">Payment Details</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">
                                        Full Name (as per UPI account)
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentDetails.fullName}
                                        onChange={(e) => setPaymentDetails({ ...paymentDetails, fullName: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100"
                                        placeholder="Enter your full name"
                                    />
                                    {userData && (userData.nameChangeCount || 0) > 0 && (
                                        <p className="text-xs text-amber-400 mt-1">
                                            Name changes: {userData.nameChangeCount}/2 used
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={paymentDetails.phone}
                                        onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">UPI ID</label>
                                    <input
                                        type="text"
                                        value={paymentDetails.upiId}
                                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100"
                                        placeholder="yourname@paytm"
                                    />
                                </div>

                                <button
                                    onClick={savePaymentDetails}
                                    disabled={savingDetails}
                                    className="w-full py-3 bg-stone-800 hover:bg-stone-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {savingDetails ? "Saving..." : "Save Payment Details"}
                                </button>
                            </div>

                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-amber-400 text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    Your name <strong>must match</strong> your UPI account name. Mismatched names will result in rejected withdrawals.
                                </p>
                            </div>
                        </div>

                        {/* Withdrawal Form */}
                        <div className="bg-stone-900 rounded-xl p-5 border border-stone-800">
                            <h3 className="font-semibold mb-4">Request Withdrawal</h3>

                            {withdrawSuccess ? (
                                <div className="text-center py-6">
                                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                    <p className="font-medium text-green-400">Withdrawal Request Submitted!</p>
                                    <p className="text-sm text-stone-400 mt-2">
                                        Admin will process your request soon.
                                    </p>
                                    <button
                                        onClick={() => setWithdrawSuccess(false)}
                                        className="mt-4 text-cyan-400 text-sm hover:underline"
                                    >
                                        Request Another
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm text-stone-400 mb-2">
                                            Amount (min ₹500)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
                                            <input
                                                type="number"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-4 py-3 text-stone-100"
                                                placeholder="500"
                                                min="500"
                                                max={wallet.available}
                                            />
                                        </div>
                                        <p className="text-xs text-stone-500 mt-1">
                                            Available: {formatCurrency(wallet.available)}
                                        </p>
                                    </div>

                                    {withdrawError && (
                                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <p className="text-red-400 text-sm">{withdrawError}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleWithdraw}
                                        disabled={withdrawing || pendingWithdrawal !== undefined}
                                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {withdrawing ? "Processing..." :
                                            pendingWithdrawal ? "Pending Withdrawal Exists" :
                                                "Request Withdrawal"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="space-y-4">
                        {/* Transaction History */}
                        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                            <h3 className="font-semibold p-4 border-b border-stone-800">Transactions</h3>

                            {loadingData ? (
                                <div className="p-8 text-center text-stone-500">Loading...</div>
                            ) : transactions.length === 0 ? (
                                <div className="p-8 text-center text-stone-500">No transactions yet</div>
                            ) : (
                                <div className="divide-y divide-stone-800">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {tx.amount > 0 ? (
                                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                        <ArrowDownRight className="w-4 h-4 text-green-400" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium capitalize">
                                                        {tx.type.replace(/_/g, " ")}
                                                    </p>
                                                    <p className="text-xs text-stone-500">
                                                        {formatDate(tx.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`font-semibold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                                                {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Withdrawal History */}
                        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                            <h3 className="font-semibold p-4 border-b border-stone-800">Withdrawals</h3>

                            {loadingData ? (
                                <div className="p-8 text-center text-stone-500">Loading...</div>
                            ) : withdrawals.length === 0 ? (
                                <div className="p-8 text-center text-stone-500">No withdrawals yet</div>
                            ) : (
                                <div className="divide-y divide-stone-800">
                                    {withdrawals.map((wd) => (
                                        <div key={wd.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {wd.status === "paid" && (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                )}
                                                {wd.status === "pending" && (
                                                    <Clock className="w-5 h-5 text-yellow-400" />
                                                )}
                                                {wd.status === "rejected" && (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                                <div>
                                                    <p className="font-medium">{formatCurrency(wd.amount)}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {formatDate(wd.requestedAt)} • {wd.upiId}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${wd.status === "paid" ? "bg-green-500/20 text-green-400" :
                                                wd.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-red-500/20 text-red-400"
                                                }`}>
                                                {wd.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
