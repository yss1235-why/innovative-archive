"use client";

import { db } from "./firebase";
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    setDoc,
    getDoc,
} from "firebase/firestore";
import {
    Box,
    Coffee,
    Shirt,
    Smartphone,
    Package,
    Gift,
    Heart,
    Star,
    Zap,
    Camera,
    Music,
    Gamepad2,
    Book,
    Palette,
    type LucideIcon,
} from "lucide-react";

// ============================================
// Types
// ============================================

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    order: number;
    active: boolean;
    createdAt?: Timestamp;
    imageUrl?: string;        // Background image for home page card
    description?: string;     // Card description text
    displayOnHome?: boolean;  // Show on home page service cards
}

export interface CategoryFormData {
    name: string;
    icon: string;
    color: string;
    order?: number;
    active?: boolean;
    imageUrl?: string;
    description?: string;
    displayOnHome?: boolean;
}

// ============================================
// Icon Mapping
// ============================================

export const iconMap: Record<string, LucideIcon> = {
    Box,
    Coffee,
    Shirt,
    Smartphone,
    Package,
    Gift,
    Heart,
    Star,
    Zap,
    Camera,
    Music,
    Gamepad2,
    Book,
    Palette,
};

export const availableIcons = Object.keys(iconMap);

export const colorOptions = [
    "blue",
    "orange",
    "purple",
    "cyan",
    "green",
    "red",
    "yellow",
    "pink",
    "indigo",
    "emerald",
];

export function getIconComponent(iconName: string): LucideIcon {
    return iconMap[iconName] || Package;
}

// ============================================
// Default Categories (for seeding)
// ============================================

const defaultCategories: Omit<Category, "createdAt">[] = [
    {
        id: "3d-print",
        name: "3D Printing",
        icon: "Box",
        color: "blue",
        order: 1,
        active: true,
        imageUrl: "/service_3d_printing.webp",
        description: "Custom objects, prototypes & decorative pieces. Bring your designs to life.",
        displayOnHome: true
    },
    {
        id: "mug",
        name: "Custom Mugs",
        icon: "Coffee",
        color: "orange",
        order: 2,
        active: true,
        imageUrl: "/service_custom_mugs.webp",
        description: "Personalized mugs with your designs, photos, or artwork. Perfect for gifts.",
        displayOnHome: true
    },
    {
        id: "tshirt",
        name: "T-Shirts",
        icon: "Shirt",
        color: "purple",
        order: 3,
        active: true,
        imageUrl: "/service_tshirts.webp",
        description: "High-quality printed tees with custom designs. Express yourself in style.",
        displayOnHome: true
    },
    {
        id: "app",
        name: "Apps & Platforms",
        icon: "Smartphone",
        color: "cyan",
        order: 4,
        active: true,
        imageUrl: "/service_apps.webp",
        description: "Mobile apps, web platforms & desktop tools. Digital solutions built with passion.",
        displayOnHome: true
    },
];

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all categories, ordered by their order field
 */
export async function getCategories(): Promise<Category[]> {
    const categoriesRef = collection(db, "categories");
    const q = query(categoriesRef, orderBy("order", "asc"));
    const snapshot = await getDocs(q);

    // If no categories exist, seed the defaults
    if (snapshot.empty) {
        await seedDefaultCategories();
        // Fetch again after seeding
        const newSnapshot = await getDocs(q);
        return newSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Category[];
    }

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Category[];
}

/**
 * Get active categories only (for public pages)
 */
export async function getActiveCategories(): Promise<Category[]> {
    const categories = await getCategories();
    return categories.filter((cat) => cat.active);
}

/**
 * Add a new category
 */
export async function addCategory(data: CategoryFormData): Promise<string> {
    // Generate slug from name
    const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Get current max order
    const categories = await getCategories();
    const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0);

    const categoryData = {
        name: data.name,
        icon: data.icon,
        color: data.color,
        order: data.order ?? maxOrder + 1,
        active: data.active ?? true,
        imageUrl: data.imageUrl || "",
        description: data.description || "",
        displayOnHome: data.displayOnHome ?? false,
        createdAt: serverTimestamp(),
    };

    // Use slug as document ID
    await setDoc(doc(db, "categories", slug), categoryData);
    return slug;
}

/**
 * Update an existing category
 */
export async function updateCategory(
    categoryId: string,
    data: Partial<CategoryFormData>
): Promise<void> {
    const categoryRef = doc(db, "categories", categoryId);
    await updateDoc(categoryRef, {
        ...data,
    });
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<void> {
    await deleteDoc(doc(db, "categories", categoryId));
}

/**
 * Seed default categories if collection is empty
 */
export async function seedDefaultCategories(): Promise<void> {
    for (const category of defaultCategories) {
        const categoryRef = doc(db, "categories", category.id);
        const existing = await getDoc(categoryRef);

        if (!existing.exists()) {
            await setDoc(categoryRef, {
                name: category.name,
                icon: category.icon,
                color: category.color,
                order: category.order,
                active: category.active,
                imageUrl: category.imageUrl || "",
                description: category.description || "",
                displayOnHome: category.displayOnHome ?? true,
                createdAt: serverTimestamp(),
            });
        } else {
            // Migrate existing categories: add new fields if missing
            const existingData = existing.data();
            if (existingData.imageUrl === undefined || existingData.description === undefined || existingData.displayOnHome === undefined) {
                await updateDoc(categoryRef, {
                    imageUrl: existingData.imageUrl ?? category.imageUrl ?? "",
                    description: existingData.description ?? category.description ?? "",
                    displayOnHome: existingData.displayOnHome ?? category.displayOnHome ?? true,
                });
            }
        }
    }
}

/**
 * Reorder categories
 */
export async function reorderCategories(
    orderedIds: string[]
): Promise<void> {
    const updates = orderedIds.map((id, index) =>
        updateDoc(doc(db, "categories", id), { order: index + 1 })
    );
    await Promise.all(updates);
}
