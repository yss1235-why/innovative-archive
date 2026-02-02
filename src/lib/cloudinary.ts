/**
 * Cloudinary Upload Utility
 * 
 * Uses unsigned upload for client-side image uploads.
 * Credentials are fetched from Firestore settings.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

interface CloudinarySettings {
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
}

interface CloudinaryUploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Get Cloudinary settings from Firestore
 */
async function getCloudinarySettings(): Promise<CloudinarySettings> {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "app"));
        if (settingsDoc.exists()) {
            return settingsDoc.data() as CloudinarySettings;
        }
    } catch (error) {
        console.error("Error fetching Cloudinary settings:", error);
    }
    return {};
}

/**
 * Upload a file to Cloudinary using unsigned upload
 * 
 * @param file - The file to upload
 * @param folder - Optional folder path in Cloudinary (e.g., "products", "services")
 * @returns CloudinaryUploadResult with success status and URL or error
 */
export async function uploadToCloudinary(
    file: File,
    folder: string = "uploads"
): Promise<CloudinaryUploadResult> {
    try {
        const settings = await getCloudinarySettings();

        if (!settings.cloudinaryCloudName || !settings.cloudinaryUploadPreset) {
            return {
                success: false,
                error: "Cloudinary not configured. Please add Cloud Name and Upload Preset in Admin Settings."
            };
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", settings.cloudinaryUploadPreset);
        formData.append("folder", folder);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${settings.cloudinaryCloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error?.message || "Upload failed"
            };
        }

        const data = await response.json();
        return {
            success: true,
            url: data.secure_url
        };
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown upload error"
        };
    }
}

/**
 * Check if Cloudinary is properly configured
 */
export async function isCloudinaryConfigured(): Promise<boolean> {
    const settings = await getCloudinarySettings();
    return !!(settings.cloudinaryCloudName && settings.cloudinaryUploadPreset);
}
