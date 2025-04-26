

const firebaseConfig = {
    apiKey: "AIzaSyBRFKljyHRjVQV--Zeui_xbnvAR8Mxyrdw",
    authDomain: "proyectoproga4.firebaseapp.com",
    projectId: "proyectoproga4",
    storageBucket: "proyectoproga4.firebasestorage.app",
    messagingSenderId: "859613674108",
    appId: "1:859613674108:web:117be6be0e18918b7ae7f9"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
const auth = firebase.auth(app);

// Definir auth y db como variables globales para que script.js pueda usarlas
window.auth = auth;
window.db = db;