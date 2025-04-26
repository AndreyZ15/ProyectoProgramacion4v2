// index.js - Funcionalidad global para autenticación y carga de paquetes

// Depuración: Confirmar que el script se ejecuta
console.log("index.js cargado");

// Depuración: Confirmar que auth y db están definidos
console.log("window.auth:", window.auth);
console.log("window.db:", window.db);

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM completamente cargado");

    // Referencias a elementos DOM para autenticación
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

    // Verificar si estamos en index.html
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index.html' || 
                        window.location.pathname === '/index';
    console.log("URL actual:", window.location.href);
    console.log("Pathname:", window.location.pathname);
    console.log("¿Es index.html?", isIndexPage);

    // Validar que los elementos necesarios existan
    if (!authButtons || !userInfo || !userNameSpan || !logoutBtn) {
        console.error("Uno o más elementos del DOM no se encontraron. Revisa el HTML.");
    }

    // Inicializar Firebase
    if (isIndexPage) {
        // Cargar elementos específicos de la página de inicio
        loadFeaturedPackages();
        setupDateInputs();
    }

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

    // Configurar botón de ir a reservas
    const goToBookingBtn = document.getElementById("go-to-booking");
    if (goToBookingBtn) {
        goToBookingBtn.addEventListener("click", function() {
            const package = document.getElementById("quick-package").value;
            const date = document.getElementById("quick-date").value;
            
            let url = "booking.html";
            const params = [];
            
            if (package) {
                params.push(`package=${package}`);
            }
            
            if (date) {
                params.push(`date=${date}`);
            }
            
            if (params.length > 0) {
                url += "?" + params.join("&");
            }
            
            window.location.href = url;
        });
    }

    // Escuchar cambios en el estado de autenticación
    window.auth.onAuthStateChanged(user => {
        if (user) {
            console.log(`Usuario autenticado: ${user.email}`);
            if (authButtons) {
                authButtons.style.display = 'none';
                console.log("authButtons ocultado");
            }

            // Mostrar el contenedor userInfo
            if (userInfo) {
                userInfo.classList.remove("d-none");
                userInfo.style.display = "flex"; // Asegurar visibilidad
                console.log("userInfo después de mostrar:", userInfo.style.display);
                console.log("Clases de userInfo:", userInfo.classList);
            }

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
            if (authButtons) {
                authButtons.style.display = 'block';
                console.log("authButtons mostrado");
            }
            if (userInfo) {
                userInfo.classList.add("d-none");
                userInfo.style.display = 'none';
                console.log("userInfo ocultado");
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                console.log("Botón de cerrar sesión ocultado");
            }
        }
    });
});

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

// Cargar paquetes destacados desde Firebase
function loadFeaturedPackages() {
    const packagesContainer = document.getElementById('packages-container');
    const loadingIndicator = document.getElementById('loading-packages');
    const noPackagesMessage = document.getElementById('no-packages-message');
    
    if (!packagesContainer) return;
    
    // Mostrar indicador de carga
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (noPackagesMessage) noPackagesMessage.style.display = 'none';
    
    // Obtener referencia a la colección de paquetes en Firestore
    const packagesRef = window.db.collection('packages');
    
    // Consultar paquetes destacados (limitados a 6)
    packagesRef.orderBy('createdAt', 'desc').limit(6).get()
        .then((snapshot) => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            if (snapshot.empty) {
                if (noPackagesMessage) noPackagesMessage.style.display = 'block';
                return;
            }
            
            // Limpiar el contenedor
            packagesContainer.innerHTML = '';
            
            // Crear tarjetas para cada paquete
            snapshot.forEach(doc => {
                const packageData = doc.data();
                const packageId = doc.id;
                
                const card = `
                    <div class="col-md-4 mb-4">
                        <div class="card package-card shadow-sm h-100">
                            <div class="position-relative">
                                <img src="${packageData.image || 'https://via.placeholder.com/300x200?text=Imagen+no+disponible'}" 
                                    class="card-img-top" alt="${packageData.title}" 
                                    style="height: 200px; object-fit: cover;">
                                <span class="badge bg-primary position-absolute top-0 end-0 m-2">$${packageData.price}</span>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${packageData.title || 'Sin título'}</h5>
                                <p class="card-text text-muted mb-2">
                                    <i class="fas fa-tag me-1"></i> ${packageData.category || 'General'}
                                </p>
                                <p class="card-text text-muted mb-2">
                                    <i class="fas fa-info-circle me-1"></i> ${packageData.summary || 'Sin resumen'}
                                </p>
                                <p class="card-text mb-3">${packageData.content || 'Sin contenido'}</p>
                                <div class="mt-auto d-flex justify-content-between">
                                    <a href="/packages?id=${packageId}" class="btn btn-outline-primary">Ver detalles</a>
                                    <a href="/booking?package=${packageId}" class="btn btn-success">Reservar</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                packagesContainer.innerHTML += card;
            });
        })
        .catch((error) => {
            console.error("Error obteniendo paquetes:", error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (noPackagesMessage) {
                noPackagesMessage.style.display = 'block';
                const messageTitle = noPackagesMessage.querySelector('h4');
                const messageText = noPackagesMessage.querySelector('p');
                if (messageTitle) messageTitle.textContent = 'Error al cargar paquetes';
                if (messageText) messageText.textContent = 'Ocurrió un error al intentar cargar los paquetes. Por favor, intenta nuevamente más tarde.';
            }
        });
}

// Script para agregar paquetes de ejemplo a Firebase (solo ejecutar una vez)
function addCorrectPackages() {
    console.log("Iniciando creación de paquetes con la estructura correcta...");
    
    // Asegúrate de que Firebase esté disponible
    if (!window.db) {
        console.error("Firebase no está inicializado");
        return;
    }
    
    // Paquetes con la estructura exacta que estás usando
    const correctPackages = [
        {
            title: "Cancún Mágico",
            category: "playa",
            summary: "Todo incluido, Resort 5 estrellas",
            content: "Disfruta de las playas cristalinas y la cultura maya en este increíble paquete.",
            price: 800,
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
            createdAt: new Date().toISOString(),
            createdBy: "admin"
        },
        {
            title: "Tour Europa",
            category: "ciudad",
            summary: "Recorre las principales ciudades europeas",
            content: "Visita a París, Roma, Barcelona y más ciudades emblemáticas de Europa",
            price: 1500,
            image: "https://images.unsplash.com/photo-1490642914619-7955a3fd483c",
            createdAt: new Date().toISOString(),
            createdBy: "admin"
        },
        {
            title: "Nueva York",
            category: "ciudad",
            summary: "La Gran Manzana te espera",
            content: "Hotel en Manhattan, City Pass, Tour en autobús, Broadway show opcional",
            price: 1100,
            image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
            createdAt: new Date().toISOString(),
            createdBy: "admin"
        },
        {
            title: "Hong Kong Espectacular",
            category: "asia",
            summary: "Experiencia única en Asia",
            content: "Tour por la ciudad, Visita a Victoria Peak, Paseo en barco por la bahía",
            price: 1200,
            image: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1",
            createdAt: new Date().toISOString(),
            createdBy: "admin"
        },
        {
            title: "Londres Clásico",
            category: "europa",
            summary: "Conoce la capital británica",
            content: "Hotel céntrico, Tours guiados, Entradas a principales atracciones",
            price: 1500,
            image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be",
            createdAt: new Date().toISOString(),
            createdBy: "admin"
        }
    ];
    
    // Referencia a la colección de paquetes
    const packagesRef = window.db.collection("packages");
    
    // Contador para seguir el proceso
    let addedCount = 0;
    let errorCount = 0;
    
    // Agregar cada paquete
    correctPackages.forEach(packageData => {
        packagesRef.add(packageData)
            .then(docRef => {
                console.log(`Paquete agregado con ID: ${docRef.id}`);
                addedCount++;
                
                if (addedCount + errorCount === correctPackages.length) {
                    console.log(`Proceso completado. Agregados: ${addedCount}, Errores: ${errorCount}`);
                    // Recargar la página para ver los cambios
                    window.location.reload();
                }
            })
            .catch(error => {
                console.error(`Error al agregar paquete ${packageData.title}:`, error);
                errorCount++;
                
                if (addedCount + errorCount === correctPackages.length) {
                    console.log(`Proceso completado. Agregados: ${addedCount}, Errores: ${errorCount}`);
                }
            });
    });
}

// Configurar fecha mínima para selectores de fecha
function setupDateInputs() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    
    dateInputs.forEach(input => {
        input.min = minDate;
    });
    
    console.log("Fechas mínimas configuradas:", minDate);
}

// Búsqueda de paquetes
function searchPackages() {
    const destination = document.getElementById('destination').value;
    const date = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const travelers = document.getElementById('travelers').value;
    
    // Redireccionar a la página de paquetes con los filtros como parámetros de URL
    let url = '/packages?';
    const params = [];
    
    if (destination && destination !== 'Cualquier destino') {
        params.push(`destination=${encodeURIComponent(destination)}`);
    }
    
    if (date) {
        params.push(`date=${encodeURIComponent(date)}`);
    }
    
    if (duration && duration !== 'Cualquier duración') {
        params.push(`duration=${encodeURIComponent(duration)}`);
    }
    
    if (travelers && travelers !== '1 persona') {
        params.push(`travelers=${encodeURIComponent(travelers)}`);
    }
    
    window.location.href = url + params.join('&');
}

// Suscripción al boletín
function subscribeNewsletter() {
    const email = document.getElementById('newsletter-email').value;
    
    if (!email) {
        alert('Por favor ingresa un correo electrónico válido.');
        return;
    }
    
    // En un escenario real, esto se enviaría al servidor
    alert(`¡Gracias por suscribirte! Te enviaremos nuestras mejores ofertas a ${email}`);
    document.getElementById('newsletter-email').value = '';
}

// Exponer funciones globalmente para ser utilizadas desde HTML
window.searchPackages = searchPackages;
window.subscribeNewsletter = subscribeNewsletter;
window.addSamplePackages = addSamplePackages; // Para ejecutar desde la consola si es necesario