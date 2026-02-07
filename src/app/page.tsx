"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/SettingsContext";
import { LoginButton } from "@/components/auth/LoginButton";
import { db } from "@/lib/firebase";
import { getCategories, seedDefaultCategories, Category } from "@/lib/categories";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles, MapPin, Quote } from "lucide-react";

// Color mapping for category hover effects
const colorMap: Record<string, { border: string; shadow: string; text: string }> = {
    blue: { border: "hover:border-blue-500/40", shadow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]", text: "text-blue-300 group-hover:text-blue-300" },
    orange: { border: "hover:border-orange-500/40", shadow: "hover:shadow-[0_0_40px_rgba(249,115,22,0.2)]", text: "text-orange-300 group-hover:text-orange-300" },
    purple: { border: "hover:border-purple-500/40", shadow: "hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]", text: "text-purple-300 group-hover:text-purple-300" },
    cyan: { border: "hover:border-cyan-500/40", shadow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]", text: "text-cyan-300 group-hover:text-cyan-300" },
    green: { border: "hover:border-green-500/40", shadow: "hover:shadow-[0_0_40px_rgba(34,197,94,0.2)]", text: "text-green-300 group-hover:text-green-300" },
    red: { border: "hover:border-red-500/40", shadow: "hover:shadow-[0_0_40px_rgba(239,68,68,0.2)]", text: "text-red-300 group-hover:text-red-300" },
    yellow: { border: "hover:border-yellow-500/40", shadow: "hover:shadow-[0_0_40px_rgba(234,179,8,0.2)]", text: "text-yellow-300 group-hover:text-yellow-300" },
    pink: { border: "hover:border-pink-500/40", shadow: "hover:shadow-[0_0_40px_rgba(236,72,153,0.2)]", text: "text-pink-300 group-hover:text-pink-300" },
};

// Default fallback image
const DEFAULT_IMAGE = "/placeholder-category.webp";

export default function Home() {
    const { user, userData } = useAuth();
    const { settings } = useSettings();
    const [homeCategories, setHomeCategories] = useState<Category[]>([]);
    const [referralLink, setReferralLink] = useState<string>("");

    // Set referral link on client side only (prevents hydration mismatch)
    useEffect(() => {
        if (userData?.referralCode) {
            setReferralLink(`${window.location.origin}?ref=${userData.referralCode}`);
        }
    }, [userData?.referralCode]);

    // Load categories from Firestore
    useEffect(() => {
        async function loadCategories() {
            try {
                // Seed defaults if needed (this will also migrate existing categories)
                await seedDefaultCategories();

                // Fetch all categories and filter for home display
                const allCategories = await getCategories();
                const homeCats = allCategories.filter(cat => cat.active && cat.displayOnHome);
                setHomeCategories(homeCats);
            } catch (error) {
                console.error("Error loading categories:", error);
            }
        }
        loadCategories();
    }, []);

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-stone-950 text-white selection:bg-purple-500/30">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-stone-950 to-stone-950 pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

            {/* UI Overlay */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                {/* Hero / About Section */}
                <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-purple-300 font-medium tracking-wider uppercase">Local • Creative • Quality</span>
                        <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>

                    <h1 className="text-5xl md:text-8xl font-thin tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                        INNOVATIVE
                        <br />
                        ARCHIVE
                    </h1>

                    <p className="text-xl md:text-2xl text-stone-400 font-light mb-6 italic">
                        "Your Vision. Our Craft."
                    </p>

                    <p className="text-stone-400 font-light max-w-2xl mx-auto mb-8 leading-relaxed">
                        We're a crew of <span className="text-white font-medium">3 creative friends</span> turning imagination into reality.
                        Whether it's a custom 3D print, a personalized mug, or a one-of-a-kind t-shirt — we craft each piece with passion.
                        <span className="text-purple-300"> Supporting local creators, makers, and dreamers</span> one print at a time.
                    </p>

                    <Link
                        href="/products"
                        className="group px-8 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        Explore Products
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </section>

                {/* Products Section - Dynamic Service Cards from Firestore */}
                <section className="container mx-auto px-4 pb-16">
                    <h2 className="text-2xl font-light text-center mb-8 text-stone-300">
                        What We <span className="text-white">Create</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {homeCategories.length === 0 ? (
                            // Loading skeleton
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-72 rounded-2xl bg-stone-900/50 animate-pulse border border-white/5" />
                            ))
                        ) : (
                            homeCategories.map((cat) => {
                                const colors = colorMap[cat.color] || colorMap.purple;
                                const isApp = cat.id === "app";

                                return (
                                    <Link key={cat.id} href={`/products?category=${cat.id}`} className="group">
                                        <div className={`relative h-72 rounded-2xl overflow-hidden border border-white/10 ${colors.border} ${colors.shadow} transition-all duration-300`}>
                                            {/* Background Image */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${cat.imageUrl || DEFAULT_IMAGE})` }}
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                            {/* Content */}
                                            <div className="absolute inset-0 flex flex-col justify-end p-6">
                                                <h3 className={`text-2xl font-light mb-2 text-white ${colors.text} transition-colors`}>{cat.name}</h3>
                                                <p className="text-stone-300 text-sm mb-4 line-clamp-2">
                                                    {cat.description || "Explore our collection."}
                                                </p>
                                                <div className={`flex items-center gap-2 text-sm ${colors.text} group-hover:underline underline-offset-4`}>
                                                    {isApp ? "View Apps" : "View Collection"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Inspirational Quote */}
                <section className="container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto text-center relative">
                        <Quote className="w-8 h-8 text-purple-500/30 mx-auto mb-4 rotate-180" />
                        <blockquote className="text-2xl md:text-3xl font-light text-stone-300 italic leading-relaxed mb-4">
                            Creativity is intelligence having fun.
                        </blockquote>
                        <p className="text-stone-600 text-sm">— Albert Einstein</p>
                        <Quote className="w-8 h-8 text-purple-500/30 mx-auto mt-4" />
                    </div>
                </section>

                {/* Referral Section - Only show if commission is enabled */}
                {settings.commissionEnabled && (
                    <section className="container mx-auto px-4 pb-20">
                        <GlassCard className="max-w-3xl mx-auto text-center border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                            <div className="bg-green-500/10 p-3 rounded-full text-green-400 w-fit mx-auto mb-4">
                                <Gift className="w-6 h-6" />
                            </div>

                            <h2 className="text-2xl font-light mb-2">
                                Refer & <span className="text-green-400">Earn</span>
                            </h2>

                            <p className="text-stone-400 mb-6 max-w-md mx-auto">
                                Share your referral link with friends. When they make their first purchase,
                                you earn a commission!
                            </p>

                            {user ? (
                                <div className="space-y-4">
                                    <div className="bg-stone-900/50 border border-white/10 rounded-lg p-4 max-w-md mx-auto">
                                        <p className="text-xs text-stone-500 mb-2">Your Referral Link</p>
                                        <code className="text-green-300 text-sm break-all">
                                            {referralLink || 'Loading...'}
                                        </code>
                                    </div>
                                    <Link
                                        href="/dashboard?tab=referrals"
                                        className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
                                    >
                                        View your referrals <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-stone-500">Sign in to get your referral link</p>
                                    <LoginButton className="mx-auto" />
                                </div>
                            )}
                        </GlassCard>
                    </section>
                )}

                {/* Footer */}
                < footer className="border-t border-white/5 py-6 md:py-8" >
                    <div className="container mx-auto px-4">
                        {/* Another Quote */}
                        <p className="text-center text-stone-500 italic text-sm mb-4 md:mb-6">
                            "Every great design begins with an even better story."
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                            {/* Brand */}
                            <div className="text-center md:text-left">
                                <h3 className="text-lg font-light mb-1">Innovative Archive</h3>
                                <p className="text-stone-600 text-xs">Your Vision. Our Craft.</p>
                            </div>

                            {/* Address */}
                            <div className="flex items-center gap-2 text-stone-500">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span className="text-sm">
                                    Ukhrul, Manipur — <span className="text-purple-300">795142</span>
                                </span>
                            </div>

                            {/* Copyright */}
                            <p className="text-stone-600 text-xs">
                                © 2026 Innovative Archive
                            </p>
                        </div>

                        {/* Tagline */}
                        <p className="text-center text-stone-700 text-xs mt-4 md:mt-6">
                            Made with ❤️ in the hills of Manipur
                        </p>
                    </div>
                </footer >
            </div >
        </main >
    );
}
