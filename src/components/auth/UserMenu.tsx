"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { User, Settings, LogOut, LayoutDashboard, ShoppingCart } from "lucide-react";

export function UserMenu() {
    const { user, userData, isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            setIsOpen(false);
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-8 h-8 rounded-full border border-white/20"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-400" />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">
                            {user.displayName}
                        </p>
                        <p className="text-xs text-stone-400 truncate">{user.email}</p>
                        {isAdmin && (
                            <span className="inline-block mt-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                Admin
                            </span>
                        )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                        <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>

                        <Link
                            href="/dashboard?tab=cart"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            My Cart
                        </Link>

                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Admin Panel
                            </Link>
                        )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/10 py-1">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
