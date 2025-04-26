// frontend/static/script.js

// Usar las variables globales definidas en firebaseConfig.js
const auth = window.auth;
const db = window.db;

// Manejar el estado de autenticación
auth.onAuthStateChanged(async (user) => {
    const authButtons = document.getElementById("auth-buttons");
    const userInfo = document.getElementById("user-info");
    const userName = document.getElementById("user-name");
    const addPackageBtn = document.getElementById("add-package-btn");

    if (user) {
        // Usuario autenticado
        authButtons.style.display = "none";
        userInfo.classList.remove("d-none");

        // Obtener el rol del usuario desde Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userName.textContent = `Hola, ${user.email}`;
            if (userData.role === "admin") {
                addPackageBtn.style.display = "inline-block"; // Mostrar botón para admins
            } else {
                addPackageBtn.style.display = "none"; // Ocultar para no admins
            }
        }
    } else {
        // No hay usuario autenticado
        authButtons.style.display = "block";
        userInfo.classList.add("d-none");
        addPackageBtn.style.display = "none";
    }
});

// Iniciar sesión
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert("Inicio de sesión exitoso");
        bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
    } catch (error) {
        alert(`Error al iniciar sesión: ${error.message}`);
    }
});

// Registrarse
document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const role = document.getElementById("userRole").value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Guardar el rol del usuario en Firestore
        await db.collection("users").doc(user.uid).set({
            email: user.email,
            role: role,
            createdAt: new Date().toISOString()
        });

        alert("Registro exitoso");
        bootstrap.Modal.getInstance(document.getElementById("signupModal")).hide();
    } catch (error) {
        alert(`Error al registrarse: ${error.message}`);
    }
});

// Cerrar sesión
document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
        await auth.signOut();
        alert("Sesión cerrada");
    } catch (error) {
        alert(`Error al cerrar sesión: ${error.message}`);
    }
});

// Agregar paquete
document.getElementById("addPackageForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Debes iniciar sesión como administrador para agregar un paquete.");
        return;
    }

    // Obtener datos del formulario
    const packageData = {
        name: document.getElementById("packageName").value,
        description: document.getElementById("packageDescription").value,
        price: parseFloat(document.getElementById("packagePrice").value),
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch("http://localhost:5000/add_package", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify(packageData)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Paquete agregado con éxito.");
            document.getElementById("addPackageForm").reset();
            bootstrap.Modal.getInstance(document.getElementById("addPackageModal")).hide();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error("Error al agregar paquete:", error);
        alert("Error al agregar el paquete. Revisa la consola para más detalles.");
    }
});

// Funciones placeholder para buscar paquetes y suscripción al boletín
window.searchPackages = function() {
    alert("Función de búsqueda de paquetes no implementada aún.");
};

window.subscribeNewsletter = function() {
    const email = document.getElementById("newsletter-email").value;
    if (email) {
        alert(`Suscripción exitosa para ${email}`);
    } else {
        alert("Por favor, ingresa un correo electrónico válido.");
    }
};