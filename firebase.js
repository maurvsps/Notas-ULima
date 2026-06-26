import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBX0SLElkX2gryepvNrR1koAMBtRbcod_Y",
  authDomain: "notasulima-e4984.firebaseapp.com",
  projectId: "notasulima-e4984",
  storageBucket: "notasulima-e4984.firebasestorage.app",
  messagingSenderId: "725701401423",
  appId: "1:725701401423:web:487d61b6570ea6b00c433a",
  measurementId: "G-MN828NYVEM"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
  auth,
  db,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc
};
