"use client";

import { Navbar } from "@/components/ui/Navbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { LoginButton } from "@/components/auth/LoginButton";
import Link from "next/link";
import { ArrowRight, Box, Coffee, Shirt, Users, Gift, Sparkles, MapPin, Quote } from "lucide-react";

export default function Home() {
    const { user, userData } = useAuth();

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
                        "Your ideas, printed locally"
                    </p>

                    <p className="text-stone-400 font-light max-w-xl mx-auto mb-8 leading-relaxed">
                        We're <span className="text-white font-medium">3 friends</span> passionate about bringing your creative ideas to life.
                        From custom mugs to unique t-shirts and 3D printed creations, we support local artists,
                        creators, and startups with quality printing services.
                    </p>

                    <Link
                        href="/products"
                        className="group px-8 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        Explore Products
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </section>

                {/* Products Section */}
                <section className="container mx-auto px-4 pb-16">
                    <h2 className="text-2xl font-light text-center mb-8 text-stone-300">
                        What We <span className="text-white">Create</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {/* 3D Printing */}
                        <Link href="/products?category=3d-print">
                            <GlassCard className="group cursor-pointer h-full hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all">
                                <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-400 w-fit mb-6">
                                    <Box className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-light mb-2">3D Printing</h3>
                                <p className="text-stone-400 text-sm mb-6">
                                    Custom 3D printed objects, prototypes, and decorative pieces. Bring your designs to life.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-blue-300 group-hover:underline underline-offset-4">
                                    View Collection <ArrowRight className="w-4 h-4" />
                                </div>
                            </GlassCard>
                        </Link>

                        {/* Mugs */}
                        <Link href="/products?category=mug">
                            <GlassCard className="group cursor-pointer h-full hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all">
                                <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-400 w-fit mb-6">
                                    <Coffee className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-light mb-2">Custom Mugs</h3>
                                <p className="text-stone-400 text-sm mb-6">
                                    Personalized mugs with your designs, photos, or artwork. Perfect for gifts or daily use.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-orange-300 group-hover:underline underline-offset-4">
                                    View Collection <ArrowRight className="w-4 h-4" />
                                </div>
                            </GlassCard>
                        </Link>

                        {/* T-Shirts */}
                        <Link href="/products?category=tshirt">
                            <GlassCard className="group cursor-pointer h-full hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all">
                                <div className="bg-purple-500/10 p-4 rounded-2xl text-purple-400 w-fit mb-6">
                                    <Shirt className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-light mb-2">T-Shirts</h3>
                                <p className="text-stone-400 text-sm mb-6">
                                    High-quality printed t-shirts with custom designs. Express yourself in style.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-purple-300 group-hover:underline underline-offset-4">
                                    View Collection <ArrowRight className="w-4 h-4" />
                                </div>
                            </GlassCard>
                        </Link>
                    </div>
                </section>

                {/* Founders Section */}
                <section className="container mx-auto px-4 py-16 border-t border-white/5">
                    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-stone-500" />
                            <span className="text-sm text-stone-500 uppercase tracking-wider">The Team</span>
                        </div>

                        <h2 className="text-2xl font-light mb-6 text-stone-300">
                            Founded by <span className="text-white">3 Passionate Creators</span>
                        </h2>

                        {/* Founder Icons */}
                        <div className="flex gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="text-2xl">👨‍💻</span>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                                <span className="text-2xl">👨‍🎨</span>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                                <span className="text-2xl">👨‍🔧</span>
                            </div>
                        </div>

                        <p className="text-stone-500 text-sm">
                            A team of friends bringing creativity and quality to every print.
                        </p>
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
                                        {typeof window !== 'undefined' ? window.location.origin : ''}?ref={userData?.referralCode || '...'}
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
                <footer className="border-t border-white/5 py-12">
                    <div className="container mx-auto px-4">
                        {/* Another Quote */}
                        <p className="text-center text-stone-500 italic text-sm mb-8">
                            "Every great design begins with an even better story."
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            {/* Brand */}
                            <div className="text-center md:text-left">
                                <h3 className="text-lg font-light mb-1">Innovative Archive</h3>
                                <p className="text-stone-600 text-xs">Your ideas, printed locally</p>
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
                        <p className="text-center text-stone-700 text-xs mt-8">
                            Made with ❤️ in the hills of Manipur
                        </p>
                    </div>
                </footer>
            </div>
        </main>
    );
}
