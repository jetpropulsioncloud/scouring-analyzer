// firebase.js


import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDBHT5V9wrjqPvvuNsFr5q1sY0lgVmjVYk",
  authDomain: "northgardbuilds.firebaseapp.com",
  projectId: "northgardbuilds",
  storageBucket: "northgardbuilds.appspot.com",
  messagingSenderId: "1005760351082",
  appId: "1:1005760351082:web:58ff96fc1ccc88935db313"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db };
