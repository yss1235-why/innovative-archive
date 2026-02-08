"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/SettingsContext";

interface ShareButtonProps {
    productId: string;
    productName: string;
    variant?: "floating" | "inline" | "card";
    className?: string;
}

export function ShareButton({ productId, productName, variant = "floating", className = "" }: ShareButtonProps) {
    const { user, userData } = useAuth();
    const { settings } = useSettings();
    const [copied, setCopied] = useState(false);

    // Build share URL with referral code if commission is enabled and user has a code
    const getShareUrl = () => {
        const baseUrl = `https://innovarc.uk/products/${productId}`;

        if (settings.commissionEnabled && user && userData?.referralCode) {
            return `${baseUrl}?ref=${userData.referralCode}`;
        }

        return baseUrl;
    };

    const handleShare = async () => {
        const shareUrl = getShareUrl();
        const shareData = {
            title: productName,
            text: `Check out ${productName} on Innovative Archive!`,
            url: shareUrl,
        };

        // Try native share on mobile
        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                // User cancelled or error, fall through to clipboard
            }
        }

        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Final fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Floating style (bottom-right fixed)
    if (variant === "floating") {
        return (
            <button
                onClick={handleShare}
                className={`fixed bottom-6 right-6 z-50 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer ${className}`}
                title={copied ? "Link copied!" : "Share product"}
            >
                {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
            </button>
        );
    }

    // Card style (small, top-right of card)
    if (variant === "card") {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    e.preventDefault();
                    handleShare();
                }}
                className={`p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-all duration-200 cursor-pointer ${className}`}
                title={copied ? "Link copied!" : "Share"}
            >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
        );
    }

    // Inline style
    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 cursor-pointer ${className}`}
        >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Share"}
        </button>
    );
}
