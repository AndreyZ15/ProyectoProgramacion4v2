

const firebaseConfig = {
    apiKey: "AIzaSyBRFKljyHRjVQV--Zeui_xbnvAR8Mxyrdw",
    authDomain: "proyectoproga4.firebaseapp.com",
    projectId: "proyectoproga4",
    storageBucket: "proyectoproga4.firebasestorage.app",
    messagingSenderId: "859613674108",
    appId: "1:859613674108:web:117be6be0e18918b7ae7f9"
};


// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar auth y db para usar en otros scripts
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar la persistencia de la sesión a SESSION
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Persistencia de sesión configurada a SESSION");
    })
    .catch((error) => {
        console.error("Error al configurar la persistencia de sesión:", error);
    });

// Hacer que auth y db estén disponibles globalmente
window.auth = auth;
window.db = db;

console.log("Firebase inicializado correctamente");