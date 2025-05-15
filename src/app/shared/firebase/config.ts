// Import the functions you need from the SDKs you need
import {initializeApp} from "firebase/app";
import {getAnalytics} from "firebase/analytics";
import {getAuth} from "firebase/auth";
import {getStorage} from "firebase/storage";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAGMqQTZBiaRKFq8iJ7fHKKtmPsLsBuG9Y",
    authDomain: "v-menu-e9835.firebaseapp.com",
    projectId: "v-menu-e9835",
    storageBucket: "v-menu-e9835.firebasestorage.app",
    messagingSenderId: "367128969586",
    appId: "1:367128969586:web:66f37c9bcb697764875deb",
    measurementId: "G-STRVD2M36Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app);