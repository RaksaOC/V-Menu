import * as admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json";

// Prevent re-initializing admin in Next.js hot reload
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export default admin;
