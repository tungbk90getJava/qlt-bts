// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Cấu hình Firebase của bạn
const firebaseConfig = {
  apiKey: "AIzaSyDP2pYyYH19gnJMzmYYQh3zlGV0iEnf3XI",
  authDomain: "qlt-bts.firebaseapp.com",
  projectId: "qlt-bts",
  storageBucket: "qlt-bts.appspot.com",
  messagingSenderId: "1005276654465",
  appId: "1:1005276654465:web:077e6b4bff31bfb563d680",
  measurementId: "G-JLB3ZTG1KY"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore
const db = getFirestore(app);

export { db };
