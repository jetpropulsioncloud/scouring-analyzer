// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4eog5dcEZg-S8za8QEakjx-9YM6JO6hU",
  authDomain: "scouringanalyzer.firebaseapp.com",
  databaseURL: "https://scouringanalyzer-default-rtdb.firebaseio.com",
  projectId: "scouringanalyzer",
  storageBucket: "scouringanalyzer.firebasestorage.app",
  messagingSenderId: "1058489343807",
  appId: "1:1058489343807:web:c45053c36c65aeee753d8a",
  measurementId: "G-1DT19P4LEV"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
export { db };
