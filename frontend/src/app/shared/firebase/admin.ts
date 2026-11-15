import * as admin from "firebase-admin";

// Service-account credentials come from env (see .env.example), never from a committed file.
// FIREBASE_PRIVATE_KEY may contain literal "\n" sequences; turn them back into newlines.
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Prevent re-initializing admin in Next.js hot reload; skip when env is missing (e.g. during `next build`)
if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
    } else {
        console.warn("firebase-admin not initialised: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
    }
}

export default admin;
