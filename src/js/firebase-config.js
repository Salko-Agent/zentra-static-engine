import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot, addDoc, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCPK8p2ddkLwZVyhUcFwCVlxImpuD77_us",
    authDomain: "zentra-c72ee.firebaseapp.com",
    projectId: "zentra-c72ee",
    storageBucket: "zentra-c72ee.firebasestorage.app",
    messagingSenderId: "298481613585",
    appId: "1:298481613585:web:c09cc4ea5bc090a512eab0",
    measurementId: "G-E7F0VQGMT6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot, addDoc, query, orderBy, limit, ref, uploadBytes, getDownloadURL, where, serverTimestamp };
