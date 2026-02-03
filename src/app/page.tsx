"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { LoginButton } from "@/components/auth/LoginButton";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles, MapPin, Quote } from "lucide-react";

// Default service card images (can be overridden by admin)
const DEFAULT_SERVICE_IMAGES = {
    "3d-print": "/service_3d_printing.webp",
    "mug": "/service_custom_mugs.webp",
    "tshirt": "/service_tshirts.webp",
    "app": "/service_apps.webp",
};

interface ServiceImages {
    "3d-print": string;
    mug: string;
    tshirt: string;
    app: string;
}

export default function Home() {
    const { user, userData } = useAuth();
    const [serviceImages, setServiceImages] = useState<ServiceImages>(DEFAULT_SERVICE_IMAGES);
    const [referralLink, setReferralLink] = useState<string>("");

    // Set referral link on client side only (prevents hydration mismatch)
    useEffect(() => {
        if (userData?.referralCode) {
            setReferralLink(`${window.location.origin}?ref=${userData.referralCode}`);
        }
    }, [userData?.referralCode]);

    // Load service images from settings
    useEffect(() => {
        async function loadSettings() {
            try {
                const settingsDoc = await getDoc(doc(db, "settings", "app"));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.serviceImages) {
                        setServiceImages({
                            "3d-print": data.serviceImages["3d-print"] || DEFAULT_SERVICE_IMAGES["3d-print"],
                            mug: data.serviceImages.mug || DEFAULT_SERVICE_IMAGES.mug,
                            tshirt: data.serviceImages.tshirt || DEFAULT_SERVICE_IMAGES.tshirt,
                            app: data.serviceImages.app || DEFAULT_SERVICE_IMAGES.app,
                        });
                    }
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        }
        loadSettings();
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

                {/* Products Section - Service Cards with Background Images */}
                <section className="container mx-auto px-4 pb-16">
                    <h2 className="text-2xl font-light text-center mb-8 text-stone-300">
                        What We <span className="text-white">Create</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {/* 3D Printing */}
                        <Link href="/products?category=3d-print" className="group">
                            <div className="relative h-72 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all duration-300">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${serviceImages["3d-print"]})` }}
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="text-2xl font-light mb-2 text-white group-hover:text-blue-300 transition-colors">3D Printing</h3>
                                    <p className="text-stone-300 text-sm mb-4 line-clamp-2">
                                        Custom objects, prototypes & decorative pieces. Bring your designs to life.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-blue-300 group-hover:underline underline-offset-4">
                                        View Collection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Mugs */}
                        <Link href="/products?category=mug" className="group">
                            <div className="relative h-72 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/40 hover:shadow-[0_0_40px_rgba(249,115,22,0.2)] transition-all duration-300">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${serviceImages.mug})` }}
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="text-2xl font-light mb-2 text-white group-hover:text-orange-300 transition-colors">Custom Mugs</h3>
                                    <p className="text-stone-300 text-sm mb-4 line-clamp-2">
                                        Personalized mugs with your designs, photos, or artwork. Perfect for gifts.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-orange-300 group-hover:underline underline-offset-4">
                                        View Collection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* T-Shirts */}
                        <Link href="/products?category=tshirt" className="group">
                            <div className="relative h-72 rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] transition-all duration-300">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${serviceImages.tshirt})` }}
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="text-2xl font-light mb-2 text-white group-hover:text-purple-300 transition-colors">T-Shirts</h3>
                                    <p className="text-stone-300 text-sm mb-4 line-clamp-2">
                                        High-quality printed tees with custom designs. Express yourself in style.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-purple-300 group-hover:underline underline-offset-4">
                                        View Collection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Apps & Platforms */}
                        <Link href="/products?category=app" className="group">
                            <div className="relative h-72 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/40 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-300">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{ backgroundImage: `url(${serviceImages.app})` }}
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="text-2xl font-light mb-2 text-white group-hover:text-cyan-300 transition-colors">Apps & Platforms</h3>
                                    <p className="text-stone-300 text-sm mb-4 line-clamp-2">
                                        Mobile apps, web platforms & desktop tools. Digital solutions built with passion.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-cyan-300 group-hover:underline underline-offset-4">
                                        View Apps <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
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

                {/* Referral Section */}
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

                {/* Footer */}
                <footer className="border-t border-white/5 py-6 md:py-8">
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
                </footer>
            </div>
        </main>
    );
}
