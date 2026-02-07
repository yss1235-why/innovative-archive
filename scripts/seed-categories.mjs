// Seed script to copy hardcoded categories to Firebase
// Run with: node scripts/seed-categories.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCt15TOBMKmQPXNNhhV7gbzK7i8oMJ23pw",
    authDomain: "innov-3d72d.firebaseapp.com",
    projectId: "innov-3d72d",
    storageBucket: "innov-3d72d.firebasestorage.app",
    messagingSenderId: "970028921208",
    appId: "1:970028921208:web:886f3693343d1ddfb9588d",
    measurementId: "G-XXF5Y6E5VW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default categories to seed (from categories.ts)
const defaultCategories = [
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

async function seedCategories() {
    console.log("🌱 Starting category seeding to Firebase...\n");

    for (const category of defaultCategories) {
        const categoryRef = doc(db, "categories", category.id);
        const existing = await getDoc(categoryRef);

        if (existing.exists()) {
            console.log(`⏭️  Category "${category.name}" already exists - skipping`);
        } else {
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
            console.log(`✅ Created category: "${category.name}" (${category.id})`);
        }
    }

    console.log("\n🎉 Seeding complete!");
    console.log(`📊 Total categories: ${defaultCategories.length}`);
    process.exit(0);
}

seedCategories().catch((error) => {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
});
