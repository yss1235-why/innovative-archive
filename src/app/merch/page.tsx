"use client";
import { Navbar } from "@/components/ui/Navbar";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { ArrowLeft, Send, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function MerchPage() {
    const [isUploading, setIsUploading] = useState(false);

    const handleCheckout = () => {
        const link = generateWhatsAppLink({
            productName: "Custom 3D Mug",
            description: "User Custom Design (Image incoming)"
        });
        window.open(link, '_blank');
    };

    return (
        <main className="min-h-screen bg-stone-950 text-white selection:bg-purple-500/30">
            <Navbar />

            <div className="container mx-auto px-4 pt-32 pb-12 flex flex-col md:flex-row gap-12 h-screen">
                {/* Left: 3D Canvas */}
                <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 flex items-center justify-center text-stone-500">
                        {/* 3D Scene will go here */}
                        <p className="font-light tracking-widest">3D CONFIGURATOR LOADING...</p>
                    </div>
                    {/* Placeholder for now */}
                    <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-xs text-stone-400">
                        Drag to Rotate • Scroll to Zoom
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-96 flex flex-col gap-6">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-white mb-6 text-sm">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                        <h1 className="text-4xl font-thin tracking-tighter mb-2">Custom Mug</h1>
                        <p className="text-stone-400 text-sm">High-quality ceramic. Dishwasher safe.</p>
                        <p className="text-2xl font-light mt-4">$25.00</p>
                    </div>

                    <div className="h-px bg-white/10 my-2"></div>

                    {/* customization Steps */}
                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">1. Upload Design</label>
                            <button
                                onClick={() => setIsUploading(!isUploading)}
                                className="w-full border border-dashed border-white/20 rounded-xl h-32 flex flex-col items-center justify-center gap-3 text-stone-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all"
                            >
                                <Upload className="w-6 h-6" />
                                <span className="text-sm">Click to Upload Image</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">2. Color</label>
                            <div className="flex gap-3">
                                {['white', 'black', 'purple'].map(c => (
                                    <button key={c} className="w-8 h-8 rounded-full border border-white/20 hover:scale-110 transition-transform" style={{ background: c === 'white' ? '#fff' : c === 'black' ? '#1c1917' : '#a855f7' }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Checkout */}
                    <button
                        onClick={handleCheckout}
                        className="w-full bg-white text-black py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        <Send className="w-4 h-4" />
                        Buy on WhatsApp
                    </button>
                    <p className="text-xs text-center text-stone-600">
                        You will be redirected to chat with us.
                        <br />Please attach your design image there.
                    </p>
                </div>
            </div>
        </main>
    );
}
