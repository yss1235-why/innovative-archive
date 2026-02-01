import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCt15TOBMKmQPXNNhhV7gbzK7i8oMJ23pw",
    authDomain: "innov-3d72d.firebaseapp.com",
    projectId: "innov-3d72d",
    storageBucket: "innov-3d72d.firebasestorage.app",
    messagingSenderId: "970028921208",
    appId: "1:970028921208:web:886f3693343d1ddfb9588d",
    measurementId: "G-XXF5Y6E5VW"
};

// Initialize Firebase (prevent re-initialization in dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
