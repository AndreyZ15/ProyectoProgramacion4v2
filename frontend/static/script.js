// script.js - Funcionalidad global para autenticación y carga de paquetes

// Depuración: Confirmar que el script se ejecuta
console.log("script.js cargado");

// Depuración: Confirmar que auth y db están definidos
console.log("window.auth:", window.auth);
console.log("window.db:", window.db);

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM completamente cargado");

    // Referencias a elementos DOM
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Depuración: Confirmar que los elementos existen
    console.log("Elementos DOM encontrados:");
    console.log("loginForm:", !!loginForm);
    console.log("signupForm:", !!signupForm);
    console.log("authButtons:", !!authButtons);
    console.log("userInfo:", !!userInfo);
    console.log("userNameSpan:", !!userNameSpan);
    console.log("logoutBtn:", !!logoutBtn);

    // Verificar si estamos en index.html (para mostrar el botón de cerrar sesión)
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index.html' || 
                        window.location.pathname === '/index';
    console.log("URL actual:", window.location.href);
    console.log("Pathname:", window.location.pathname);
    console.log("¿Es index.html?", isIndexPage);

    // Validar que los elementos necesarios existan
    if (!authButtons || !userInfo || !userNameSpan || !logoutBtn) {
        console.error("Uno o más elementos del DOM no se encontraron. Revisa el HTML.");
        return;
    }

    // Inicializar Firebase Auth
    if (!window.auth) {
        console.error("Firebase Auth no está disponible");
        return;
    }
    console.log("Firebase Auth inicializado correctamente");

    // Configurar event listeners para formularios
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log("Evento submit asignado a loginForm");
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log("Evento submit asignado a signupForm");
    }

    if (logoutBtn && isIndexPage) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log("Evento click asignado al botón de cerrar sesión");
    } else {
        console.log("No se asignó evento al botón de cerrar sesión. logoutBtn:", !!logoutBtn, "isIndexPage:", isIndexPage);
    }

    // Escuchar cambios en el estado de autenticación
    window.auth.onAuthStateChanged(user => {
        if (user) {
            console.log(`Usuario autenticado: ${user.email}`);
            authButtons.style.display = 'none';
            console.log("authButtons ocultado");

            // Mostrar el contenedor userInfo
            userInfo.classList.remove("d-none");
            userInfo.style.display = "flex"; // Asegurar visibilidad
            console.log("userInfo después de mostrar:", userInfo.style.display);
            console.log("Clases de userInfo:", userInfo.classList);

            // Mostrar el nombre del usuario
            if (userNameSpan) {
                userNameSpan.textContent = user.email;
                console.log("Nombre de usuario actualizado:", user.email);
            }

            // Mostrar el botón de cerrar sesión solo en index.html
            if (logoutBtn) {
                logoutBtn.style.display = isIndexPage ? 'inline-block' : 'none';
                console.log("Botón de cerrar sesión configurado. Visible:", isIndexPage);
            } else {
                console.warn("Botón de cerrar sesión no encontrado");
            }
        } else {
            console.log("No hay usuario autenticado");
            authButtons.style.display = 'block';
            console.log("authButtons mostrado");
            userInfo.classList.add("d-none");
            userInfo.style.display = 'none';
            console.log("userInfo ocultado");
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                console.log("Botón de cerrar sesión ocultado");
            }
        }
    });

    // Cargar paquetes destacados al iniciar
    loadPackages();

    // Función para manejar el inicio de sesión
    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await window.auth.signInWithEmailAndPassword(email, password);
            console.log("Inicio de sesión exitoso");
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) modal.hide();
            alert("Inicio de sesión exitoso");
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            alert("Error: " + error.message);
        }
    }

    // Función para manejar el registro
    async function handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const role = document.getElementById('userRole').value;

        try {
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Guardar datos del usuario en Firestore
            await window.db.collection('users').doc(user.uid).set({
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            });

            console.log("Usuario registrado con rol:", role);
            const modal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
            if (modal) modal.hide();
            alert("Registro exitoso");
        } catch (error) {
            console.error("Error al registrar usuario:", error);
            alert("Error: " + error.message);
        }
    }

    // Función para manejar el cierre de sesión
    async function handleLogout() {
        try {
            await window.auth.signOut();
            console.log("Cierre de sesión exitoso");
            alert("Cierre de sesión exitoso");
            window.location.href = "/"; // Redirigir a index.html
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error: " + error.message);
        }
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

    // Función para cargar paquetes destacados desde Firestore
    async function loadPackages() {
        const packagesContainer = document.getElementById('packages-container');
        const loadingPackages = document.getElementById('loading-packages');
        const noPackagesMessage = document.getElementById('no-packages-message');

        if (!packagesContainer || !loadingPackages || !noPackagesMessage) {
            console.error("Elementos necesarios para cargar paquetes no encontrados en el DOM.");
            return;
        }

        if (!window.db) {
            console.error("Firestore no está disponible (window.db no definido).");
            loadingPackages.style.display = 'none';
            noPackagesMessage.style.display = 'block';
            return;
        }

        try {
            console.log("Cargando paquetes desde Firestore...");
            const snapshot = await window.db.collection('packages')
                .orderBy('createdAt', 'desc')
                .limit(3) // Limitar a 3 paquetes destacados
                .get();

            loadingPackages.style.display = 'none';

            if (snapshot.empty) {
                console.log("No se encontraron paquetes en Firestore.");
                noPackagesMessage.style.display = 'block';
                return;
            }

            noPackagesMessage.style.display = 'none';

            snapshot.forEach(doc => {
                const packageData = doc.data();
                console.log("Paquete encontrado:", packageData);

                const packageCard = `
                    <div class="col-md-4 mb-4">
                        <div class="card shadow-sm">
                            ${packageData.image ? `<img src="${packageData.image}" class="card-img-top" alt="${packageData.name}" style="height: 200px; object-fit: cover;">` : ''}
                            <div class="card-body">
                                <h5 class="card-title">${packageData.name}</h5>
                                <p class="card-text"><strong>Destino:</strong> ${packageData.destination}</p>
                                <p class="card-text"><strong>Precio:</strong> $${packageData.price.toFixed(2)} USD</p>
                                <p class="card-text"><strong>Duración:</strong> ${packageData.duration} días</p>
                                <p class="card-text">${packageData.description}</p>
                                ${packageData.includes ? `<p class="card-text"><strong>Incluye:</strong> ${packageData.includes}</p>` : ''}
                                <a href="/packages" class="btn btn-primary btn-sm">Ver Detalles</a>
                            </div>
                        </div>
                    </div>
                `;
                packagesContainer.insertAdjacentHTML('beforeend', packageCard);
            });
        } catch (error) {
            console.error("Error al cargar paquetes desde Firestore:", error);
            loadingPackages.style.display = 'none';
            noPackagesMessage.style.display = 'block';
        }
    }

    // Hacer la función accesible globalmente
    window.loadPackages = loadPackages;
});