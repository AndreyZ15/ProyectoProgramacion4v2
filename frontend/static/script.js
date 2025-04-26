// frontend/static/script.js

// Usar las variables globales definidas en firebaseConfig.js
const auth = window.auth;
const db = window.db;

// Depuración: Confirmar que el script se ejecuta
console.log("script.js cargado");

// Depuración: Confirmar que auth y db están definidos
console.log("auth:", auth);
console.log("db:", db);

// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM completamente cargado");

    // Obtener los elementos del DOM
    const authButtons = document.getElementById("auth-buttons");
    const userInfo = document.getElementById("user-info");
    const userName = document.getElementById("user-name");
    const addPackageBtn = document.getElementById("add-package-btn");
    const logoutBtn = document.getElementById("logout-btn");

    // Depuración: Confirmar que los elementos existen
    console.log("authButtons:", authButtons);
    console.log("userInfo:", userInfo);
    console.log("userName:", userName);
    console.log("addPackageBtn:", addPackageBtn);
    console.log("logoutBtn:", logoutBtn);

    // Manejar el estado de autenticación
    auth.onAuthStateChanged(async (user) => {
        console.log("onAuthStateChanged ejecutado, usuario:", user);

        if (!authButtons || !userInfo || !userName || !logoutBtn) {
            console.error("Uno o más elementos del DOM no se encontraron. Revisa el HTML.");
            return;
        }

        if (user) {
            // Usuario autenticado
            console.log("Usuario autenticado:", user.email);
            authButtons.style.display = "none";
            console.log("authButtons después de ocultar:", authButtons.style.display);

            userInfo.classList.remove("d-none");
            userInfo.style.display = "flex"; // Asegurarse de que sea visible
            console.log("userInfo después de mostrar:", userInfo.style.display);
            console.log("Clases de userInfo:", userInfo.classList);

            logoutBtn.style.display = "inline-block"; // Forzar visibilidad del botón
            console.log("logoutBtn después de mostrar:", logoutBtn.style.display);

            userName.textContent = `Hola, ${user.email}`;

            // Obtener el rol del usuario desde Firestore
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log("Datos del usuario:", userData);
                    if (addPackageBtn) {
                        if (userData.role === "admin") {
                            addPackageBtn.style.display = "inline-block";
                        } else {
                            addPackageBtn.style.display = "none";
                        }
                    }
                } else {
                    console.error("No se encontró el documento del usuario en Firestore");
                }
            } catch (error) {
                console.error("Error al obtener datos del usuario desde Firestore:", error);
            }
        } else {
            // No hay usuario autenticado
            console.log("No hay usuario autenticado");
            authButtons.style.display = "block";
            userInfo.classList.add("d-none");
            userInfo.style.display = "none";
            if (addPackageBtn) addPackageBtn.style.display = "none";
        }
    });

    // Iniciar sesión
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            console.log("Inicio de sesión exitoso");
            bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
        } catch (error) {
            console.error("Error al iniciar sesión:", error.message);
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

            console.log("Registro exitoso");
            bootstrap.Modal.getInstance(document.getElementById("signupModal")).hide();
        } catch (error) {
            console.error("Error al registrarse:", error.message);
            alert(`Error al registrarse: ${error.message}`);
        }
    });

    // Cerrar sesión
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
        try {
            await auth.signOut();
            console.log("Sesión cerrada");
            window.location.href = "/"; // Redirigir a index.html
        } catch (error) {
            console.error("Error al cerrar sesión:", error.message);
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

    // Funciones placeholder
    window.searchPackages = function() {
        alert("Función de búsqueda de paquetes no implementada aún.");
    };

    window.subscribeNewsletter = function() {
        const email = document.getElementById("newsletter-email")?.value;
        if (email) {
            alert(`Suscripción exitosa para ${email}`);
        } else {
            alert("Por favor, ingresa un correo electrónico válido.");
        }
    };
});