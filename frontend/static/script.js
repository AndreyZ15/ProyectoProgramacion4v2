// frontend/static/script.js

// Depuración: Confirmar que el script se ejecuta
console.log("script.js cargado");

// Depuración: Confirmar que auth y db están definidos
console.log("window.auth:", window.auth);
console.log("window.db:", window.db);

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
    window.auth.onAuthStateChanged(async (user) => {
        console.log("onAuthStateChanged ejecutado, usuario:", user);

        if (!authButtons || !userInfo || !userName || !logoutBtn) {
            console.error("Uno o más elementos del DOM no se encontraron. Revisa el HTML.");
            return;
        }

        if (user) {
            // Usuario autenticado
            console.log("Usuario autenticado:", user.email);
            authButtons.style.display = "none";
            userInfo.classList.remove("d-none");
            userInfo.style.display = "flex"; // Asegurarse de que sea visible
            console.log("userInfo después de mostrar:", userInfo.style.display);
            console.log("Clases de userInfo:", userInfo.classList);

            logoutBtn.style.display = "inline-block"; // Forzar visibilidad del botón
            console.log("logoutBtn después de mostrar:", logoutBtn.style.display);

            userName.textContent = `Hola, ${user.email}`;

            // Obtener el rol del usuario desde Firestore
            try {
                const userDoc = await window.db.collection("users").doc(user.uid).get();
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
            await window.auth.signInWithEmailAndPassword(email, password);
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
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Guardar el rol del usuario en Firestore
            await window.db.collection("users").doc(user.uid).set({
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
            await window.auth.signOut();
            console.log("Sesión cerrada");
            window.location.href = "/"; // Redirigir a index.html
        } catch (error) {
            console.error("Error al cerrar sesión:", error.message);
            alert(`Error al cerrar sesión: ${error.message}`);
        }
    });

    // Agregar paquete - Añadir el listener cuando el modal se abra
    const addPackageModalEl = document.getElementById("addPackageModal");
    if (addPackageModalEl) {
        addPackageModalEl.addEventListener("shown.bs.modal", () => {
            console.log("Modal addPackageModal abierto - Configurando listener del formulario");

            const addPackageForm = document.getElementById("addPackageForm");
            if (!addPackageForm) {
                console.error("Formulario addPackageForm no encontrado dentro del modal.");
                return;
            }

            // Remover listeners previos para evitar duplicados
            addPackageForm.removeEventListener("submit", handleAddPackageForm);
            addPackageForm.addEventListener("submit", handleAddPackageForm);
        });
    } else {
        console.error("Modal addPackageModal no encontrado en el DOM.");
    }

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

// Función para manejar el envío del formulario de añadir paquete
async function handleAddPackageForm(e) {
    e.preventDefault();
    console.log("Iniciando proceso de añadir paquete");

    const user = window.auth.currentUser;
    if (!user) {
        console.error("No hay usuario autenticado");
        alert("Debes iniciar sesión como administrador para agregar un paquete.");
        return;
    }

    // Verificar si el usuario es administrador
    try {
        const userDoc = await window.db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) {
            console.error("No se encontró el documento del usuario en Firestore");
            alert("Error: No se encontró el perfil del usuario.");
            return;
        }

        const userData = userDoc.data();
        if (userData.role !== "admin") {
            console.log("Usuario no es administrador, no puede agregar paquetes");
            alert("Solo los administradores pueden agregar paquetes.");
            return;
        }

        // Obtener los elementos del formulario
        const packageName = document.getElementById("packageName");
        const packageDestination = document.getElementById("packageDestination");
        const packagePrice = document.getElementById("packagePrice");
        const packageDuration = document.getElementById("packageDuration");
        const packageDescription = document.getElementById("packageDescription");
        const packageImage = document.getElementById("packageImage");
        const packageIncludes = document.getElementById("packageIncludes");

        // Verificar que los campos obligatorios existan
        const missingFields = [];
        if (!packageName) missingFields.push("packageName");
        if (!packageDestination) missingFields.push("packageDestination");
        if (!packagePrice) missingFields.push("packagePrice");
        if (!packageDuration) missingFields.push("packageDuration");
        if (!packageDescription) missingFields.push("packageDescription");

        if (missingFields.length > 0) {
            console.error("Faltan los siguientes campos en el formulario:", missingFields.join(", "));
            alert(`Error: No se encontraron los siguientes campos en el formulario: ${missingFields.join(", ")}. Por favor, verifica el HTML.`);
            return;
        }

        // Obtener los valores del formulario
        const packageData = {
            name: packageName.value,
            destination: packageDestination.value,
            price: parseFloat(packagePrice.value),
            duration: parseInt(packageDuration.value),
            description: packageDescription.value,
            image: packageImage ? packageImage.value || null : null,
            includes: packageIncludes ? packageIncludes.value || null : null,
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        };

        console.log("Datos del paquete a añadir:", packageData);

        // Validar datos mínimos
        if (!packageData.name || !packageData.destination || !packageData.price || !packageData.duration || !packageData.description) {
            throw new Error("Por favor, completa todos los campos obligatorios.");
        }

        // Añadir a Firestore
        console.log("Intentando añadir documento a Firestore...");
        const docRef = await window.db.collection("packages").add(packageData);

        console.log("Paquete añadido correctamente. ID:", docRef.id);

        // Mostrar mensaje de éxito
        alert(`Paquete "${packageData.name}" añadido con éxito.`);

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("addPackageModal"));
        if (modal) modal.hide();

        // Resetear formulario
        document.getElementById("addPackageForm").reset();

        // Recargar paquetes
        if (typeof loadPackages === "function") {
            loadPackages();
        } else {
            console.warn("Función loadPackages no definida. Recarga la página para ver el nuevo paquete.");
            window.location.reload();
        }
    } catch (error) {
        console.error("Error al añadir paquete:", error);
        alert("Error al añadir paquete: " + error.message);
    }
}