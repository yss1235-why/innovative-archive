/**
 * Custom Cloudinary image loader for next/image with static export.
 *
 * How it works:
 * - For absolute URLs (e.g. Cloudinary-hosted product images), it wraps
 *   them in Cloudinary's "fetch" URL so they are served optimized.
 * - For relative paths (e.g. /service_tshirts.webp), it returns them
 *   as-is because they are already optimized local WebP files.
 * - If no cloud name is configured, images are served as-is (no breakage).
 *
 * Requires: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderParams): string {
    // No cloud name configured — serve images as-is
    if (!CLOUD_NAME) {
        return src;
    }

    // Relative paths are local static assets — already optimized WebP, serve as-is
    if (src.startsWith("/")) {
        return src;
    }

    // Already a Cloudinary URL — add transformations
    if (src.includes("res.cloudinary.com")) {
        // Insert transformations before /upload/ or /fetch/
        const parts = src.split(/\/(upload|fetch)\//);
        if (parts.length >= 3) {
            const transformations = `w_${width},q_${quality || 75},f_auto`;
            return `${parts[0]}/${parts[1]}/${transformations}/${parts.slice(2).join("/")}`;
        }
    }

    // External URL — use Cloudinary fetch mode to optimize on the fly
    const transformations = `w_${width},q_${quality || 75},f_auto`;
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(src)}`;
}
