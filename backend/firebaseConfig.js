
// Initialize Firebase

const firebaseConfig = {
    apiKey: "AIzaSyBRFKljyHRjVQV--Zeui_xbnvAR8Mxyrdw",
    authDomain: "proyectoproga4.firebaseapp.com",
    projectId: "proyectoproga4",
    storageBucket: "proyectoproga4.firebasestorage.app",
    messagingSenderId: "859613674108",
    appId: "1:859613674108:web:117be6be0e18918b7ae7f9"
};

// Inicializa Firebase usando la variable global
firebase.initializeApp(firebaseConfig);

// Exporta auth y db para usarlos en otros archivos
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };