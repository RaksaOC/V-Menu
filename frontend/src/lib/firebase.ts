// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { AUTH_EMULATOR_URL } from "./auth-emulator";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics needs `window`; skip it during server rendering / next build
// and a measurement ID; staging builds have none (Analytics is production only)
// and none in e2e builds (B6), which must not reach real Google services
export const analytics = typeof window !== "undefined" && firebaseConfig.measurementId && !AUTH_EMULATOR_URL ? getAnalytics(app) : null;
export const auth = getAuth(app);
// B6: e2e builds only; every real build has no emulator URL
if (AUTH_EMULATOR_URL) connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
export const storage = getStorage(app);
