"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { LoginButton } from "@/components/auth/LoginButton";
import { UserMenu } from "@/components/auth/UserMenu";

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <nav className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-full px-6 py-3 flex gap-6 items-center shadow-2xl">
                {/* Logo */}
                <Link href="/" className="relative w-8 h-8 rounded-full overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                </Link>

                <div className="h-4 w-px bg-white/10"></div>

                {/* Nav Links */}
                <div className="flex gap-6 text-sm font-light">
                    <Link href="/" className="text-stone-300 hover:text-white transition-colors">Home</Link>
                    <Link href="/products" className="text-stone-300 hover:text-white transition-colors">Products</Link>
                </div>

                <div className="h-4 w-px bg-white/10"></div>

                {/* Auth */}
                <div className="flex items-center">
                    {loading ? (
                        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
                    ) : user ? (
                        <UserMenu />
                    ) : (
                        <LoginButton />
                    )}
                </div>
            </div>
        </nav>
    );
}
