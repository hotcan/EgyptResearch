/*  Firebase 配置
 *  ─────────────
 *  请前往 https://console.firebase.google.com 创建项目，
 *  启用 Firestore Database（test mode），
 *  然后将下方 firebaseConfig 替换为你的项目配置。
 */
const firebaseConfig = {
    apiKey: "AIzaSyBedLooUhmJ_0K99ZcujmtLM2c66J9wuho",
    authDomain: "egypt-research.firebaseapp.com",
    projectId: "egypt-research",
    storageBucket: "egypt-research.firebasestorage.app",
    messagingSenderId: "792756700404",
    appId: "1:792756700404:web:14aa0cea7925e6244ecaa1",
    measurementId: "G-0GSY2KNR8V"
  };

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
