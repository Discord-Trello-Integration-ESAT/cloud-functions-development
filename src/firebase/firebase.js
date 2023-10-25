import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKcxGr9zzRWDqjEt6yRgys4nBv0gEFN4g",
  authDomain: "esat-alpha-26c1b.firebaseapp.com",
  projectId: "esat-alpha-26c1b",
  storageBucket: "esat-alpha-26c1b.appspot.com",
  messagingSenderId: "8313852575",
  appId: "1:8313852575:web:8c2ec047893b5541dec8aa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// Export for use in other files
export { app, auth, db };

