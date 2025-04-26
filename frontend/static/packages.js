// packages.js con depuración mejorada y manejo de imágenes mejorado

// Referencias a elementos del DOM
const packagesContainer = document.getElementById('packages-container');
const loadingIndicator = document.getElementById('loading-packages');
const noPackagesMessage = document.getElementById('no-packages-message');
const searchInput = document.getElementById('search-packages');
const sortSelect = document.getElementById('sort-packages');
const addPackageForm = document.getElementById('addPackageForm');

console.log("packages.js cargado - Inicializando gestión de paquetes");

// Verificar que Firebase y Firestore estén disponibles
if (!window.firebase) {
    console.error("Error: Firebase no está disponible");
} else {
    console.log("Firebase disponible ✓");
}

if (!window.db) {
    console.error("Error: db (Firestore) no está disponible");
} else {
    console.log("Firestore disponible ✓");
}

// Referencia a la colección de paquetes en Firestore
console.log("Intentando acceder a la colección 'packages'");
const packagesRef = window.db.collection('packages');

// Cargar paquetes al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado - Configurando event listeners");
    
    // Event listeners para ordenamiento y búsqueda
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
        console.log("Event listener para ordenamiento configurado ✓");
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        console.log("Event listener para búsqueda configurado ✓");
    }
    
    // Event listener para el formulario de añadir paquete
    if (addPackageForm) {
        console.log("Formulario de añadir paquete encontrado, configurando event listener");
        addPackageForm.addEventListener('submit', handleAddPackage);
    } else {
        console.error("Error: Formulario de añadir paquete no encontrado (#addPackageForm)");
    }
    
    // Event listener para el formulario de editar paquete
    const editPackageForm = document.getElementById('editPackageForm');
    if (editPackageForm) {
        editPackageForm.addEventListener('submit', handleEditPackage);
    }
    
    // Event listener para confirmar eliminación
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeletePackage);
    }
    
    // Cargar paquetes
    console.log("Iniciando carga de paquetes...");
    loadPackages();
});

// Función para cargar los paquetes desde Firebase
async function loadPackages() {
    try {
        console.log("loadPackages() - Intentando cargar paquetes desde Firestore");
        showLoading(true);
        
        // Obtener paquetes de Firestore
        console.log("Obteniendo snapshot de la colección 'packages'");
        const snapshot = await packagesRef.get();
        
        console.log(`Snapshot obtenido - ${snapshot.size} documentos encontrados`);
        
        if (snapshot.empty) {
            console.log("No se encontraron paquetes en Firestore");
            showNoPackagesMessage(true);
            allPackages = [];
        } else {
            allPackages = snapshot.docs.map(doc => {
                console.log(`Paquete encontrado - ID: ${doc.id}, Nombre: ${doc.data().name}`);
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });
            
            console.log(`${allPackages.length} paquetes cargados con éxito`);
            
            // Ordenar inicialmente por nombre
            filteredPackages = [...allPackages];
            applyFilters();
        }
    } catch (error) {
        console.error('Error al cargar paquetes:', error);
        alert('Error al cargar los paquetes: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Función para mostrar/ocultar indicador de carga
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
    if (packagesContainer) {
        packagesContainer.style.display = show ? 'none' : 'block'; // Ajustado para respetar la cuadrícula de Bootstrap
    }
}

// Función para mostrar/ocultar mensaje de no paquetes
function showNoPackagesMessage(show) {
    if (noPackagesMessage) {
        noPackagesMessage.style.display = show ? 'block' : 'none';
    }
}

// Variables para almacenar los paquetes y filtrados
let allPackages = [];
let filteredPackages = [];

// Función para aplicar filtros (búsqueda y ordenamiento)
function applyFilters() {
    console.log("Aplicando filtros a los paquetes");
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortOption = sortSelect ? sortSelect.value : 'name-asc';
    
    // Filtrar por término de búsqueda
    filteredPackages = allPackages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm) || 
        (pkg.description && pkg.description.toLowerCase().includes(searchTerm)) ||
        (pkg.destination && pkg.destination.toLowerCase().includes(searchTerm))
    );
    
    console.log(`Filtrado: ${filteredPackages.length} paquetes coinciden con "${searchTerm}"`);
    
    // Aplicar ordenamiento
    switch (sortOption) {
        case 'price-asc':
            filteredPackages.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredPackages.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filteredPackages.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredPackages.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
    
    console.log(`Paquetes ordenados por ${sortOption}`);
    
    // Mostrar paquetes filtrados
    renderPackages(filteredPackages);
}

// Función para renderizar los paquetes en la página
function renderPackages(packages) {
    console.log(`Renderizando ${packages.length} paquetes en la interfaz`);
    
    if (!packagesContainer) {
        console.error("Error: Container de paquetes no encontrado (#packages-container)");
        return;
    }
    
    packagesContainer.innerHTML = '';
    
    if (packages.length === 0) {
        console.log("No hay paquetes para mostrar");
        showNoPackagesMessage(true);
        return;
    }
    
    showNoPackagesMessage(false);
    
    packages.forEach(pkg => {
        const card = createPackageCard(pkg);
        packagesContainer.appendChild(card);
    });
    
    console.log("Renderizado completado");
}

// Función para crear un card de paquete
function createPackageCard(pkg) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    // URL de imagen por defecto si no hay una
    const imageUrl = pkg.image || 'https://placehold.co/300x200/CCCCCC/FFFFFF?text=Imagen+No+Disponible';
    
    col.innerHTML = `
        <div class="card package-card h-100">
            <div class="image-container">
                <img src="${imageUrl}" class="card-img-top" alt="${pkg.name}" onerror="this.src='https://placehold.co/300x200/CCCCCC/FFFFFF?text=Imagen+No+Disponible';">
            </div>
            <div class="card-body">
                <h5 class="card-title">${pkg.name}</h5>
                ${pkg.destination ? `<p class="card-subtitle mb-2 text-muted"><i class="fas fa-map-marker-alt me-2"></i>${pkg.destination}</p>` : ''}
                <p class="card-text">${pkg.description ? pkg.description.substring(0, 100) + (pkg.description.length > 100 ? '...' : '') : 'Sin descripción'}</p>
                <div class="package-details mb-3">
                    <div class="package-price">
                        <span class="price-label">Precio</span>
                        <span class="price-value">$${pkg.price ? pkg.price.toFixed(2) : '0.00'} USD</span>
                    </div>
                    ${pkg.duration ? `
                    <div class="package-duration">
                        <span class="duration-label"><i class="far fa-clock me-1"></i>Duración</span>
                        <span class="duration-value">${pkg.duration} días</span>
                    </div>` : ''}
                    ${pkg.includes ? `
                    <div class="package-includes">
                        <span class="includes-label"><i class="fas fa-check-circle me-1"></i>Incluye</span>
                        <span class="includes-value">${pkg.includes}</span>
                    </div>` : ''}
                </div>
            </div>
            <div class="card-footer d-flex justify-content-between bg-white">
                <a href="#" class="btn btn-outline-primary btn-sm view-details" data-id="${pkg.id}">Ver Detalles</a>
                <div class="admin-actions" style="display: none;" data-package-id="${pkg.id}">
                    <button class="btn btn-sm btn-outline-warning edit-package" data-id="${pkg.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-package" data-id="${pkg.id}" data-name="${pkg.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar event listeners para editar y eliminar
    const editBtn = col.querySelector('.edit-package');
    const deleteBtn = col.querySelector('.delete-package');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => openEditPackageModal(pkg));
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => openDeletePackageModal(pkg));
    }
    
    return col;
}

// Función para manejar la adición de un nuevo paquete
async function handleAddPackage(e) {
    e.preventDefault();
    console.log("handleAddPackage() - Procesando envío del formulario");
    
    const user = window.auth.currentUser;
    if (!user) {
        console.error("No hay usuario autenticado");
        alert('Debes iniciar sesión como administrador para añadir un paquete.');
        return;
    }
    
    console.log(`Usuario autenticado: ${user.email}`);
    
    // Obtener datos del formulario
    try {
        const packageName = document.getElementById('packageName').value;
        const packageDestination = document.getElementById('packageDestination').value;
        const packagePrice = document.getElementById('packagePrice').value;
        const packageDuration = document.getElementById('packageDuration').value;
        const packageDescription = document.getElementById('packageDescription').value;
        const packageImage = document.getElementById('packageImage').value;
        const packageIncludes = document.getElementById('packageIncludes').value;
        
        console.log("Datos del formulario recuperados:");
        console.log("- Nombre:", packageName);
        console.log("- Destino:", packageDestination);
        console.log("- Precio:", packagePrice);
        console.log("- Duración:", packageDuration);
        
        const packageData = {
            name: packageName,
            destination: packageDestination,
            price: parseFloat(packagePrice),
            duration: parseInt(packageDuration),
            description: packageDescription,
            image: packageImage || null,
            includes: packageIncludes || null,
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        };
        
        console.log("Datos del paquete preparados:", packageData);
        
        // Verificar Firestore
        if (!window.db || !window.db.collection) {
            throw new Error("La referencia a Firestore no está disponible");
        }
        
        console.log("Intentando añadir documento a la colección 'packages'...");
        
        // Agregar directamente a Firestore
        const docRef = await window.db.collection('packages').add(packageData);
        
        console.log(`¡Éxito! Paquete añadido con ID: ${docRef.id}`);
        
        // Cerrar modal
        const addPackageModal = bootstrap.Modal.getInstance(document.getElementById('addPackageModal'));
        if (addPackageModal) {
            addPackageModal.hide();
        } else {
            console.warn("No se pudo encontrar la instancia del modal");
        }
        
        // Resetear formulario
        document.getElementById('addPackageForm').reset();
        
        // Feedback al usuario
        alert('Paquete añadido con éxito.');
        
        // Recargar paquetes
        console.log("Recargando lista de paquetes...");
        loadPackages();
    } catch (error) {
        console.error('Error detallado al añadir paquete:', error);
        alert('Error al añadir el paquete: ' + error.message);
    }
}

// Función para abrir modal de edición de paquete
function openEditPackageModal(pkg) {
    console.log(`Abriendo modal de edición para paquete ${pkg.id}`);
    
    // Rellenar el formulario con los datos del paquete
    document.getElementById('editPackageName').value = pkg.name;
    document.getElementById('editPackageDestination').value = pkg.destination || '';
    document.getElementById('editPackagePrice').value = pkg.price;
    document.getElementById('editPackageDuration').value = pkg.duration || '';
    document.getElementById('editPackageDescription').value = pkg.description;
    document.getElementById('editPackageImage').value = pkg.image || '';
    document.getElementById('editPackageIncludes').value = pkg.includes || '';
    document.getElementById('editPackageId').value = pkg.id;
    
    // Abrir el modal
    const editPackageModal = new bootstrap.Modal(document.getElementById('editPackageModal'));
    editPackageModal.show();
}

// Función para manejar la edición de un paquete
async function handleEditPackage(e) {
    e.preventDefault();
    console.log("handleEditPackage() - Procesando actualización");
    
    const user = window.auth.currentUser;
    if (!user) {
        alert('Debes iniciar sesión como administrador para editar un paquete.');
        return;
    }
    
    const packageId = document.getElementById('editPackageId').value;
    console.log(`Editando paquete con ID: ${packageId}`);
    
    // Obtener datos actualizados del formulario
    const updatedData = {
        name: document.getElementById('editPackageName').value,
        destination: document.getElementById('editPackageDestination').value,
        price: parseFloat(document.getElementById('editPackagePrice').value),
        duration: parseInt(document.getElementById('editPackageDuration').value),
        description: document.getElementById('editPackageDescription').value,
        image: document.getElementById('editPackageImage').value || null,
        includes: document.getElementById('editPackageIncludes').value || null,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
    };
    
    console.log("Datos actualizados:", updatedData);
    
    try {
        // Actualizar paquete en Firestore
        await window.db.collection('packages').doc(packageId).update(updatedData);
        
        console.log("Paquete actualizado con éxito");
        
        // Cerrar modal
        const editPackageModal = bootstrap.Modal.getInstance(document.getElementById('editPackageModal'));
        if (editPackageModal) {
            editPackageModal.hide();
        }
        
        // Feedback al usuario
        alert('Paquete actualizado con éxito.');
        
        // Recargar paquetes
        loadPackages();
    } catch (error) {
        console.error('Error al actualizar paquete:', error);
        alert('Error al actualizar el paquete: ' + error.message);
    }
}

// Función para abrir modal de confirmación de eliminación
function openDeletePackageModal(pkg) {
    console.log(`Abriendo modal de eliminación para paquete ${pkg.id}`);
    document.getElementById('packageToDelete').textContent = pkg.name;
    document.getElementById('confirmDeleteBtn').setAttribute('data-id', pkg.id);
    const deletePackageModal = new bootstrap.Modal(document.getElementById('deletePackageModal'));
    deletePackageModal.show();
}

// Función para manejar la eliminación de un paquete
async function handleDeletePackage() {
    const packageId = document.getElementById('confirmDeleteBtn').getAttribute('data-id');
    console.log(`Eliminando paquete con ID: ${packageId}`);
    
    const user = window.auth.currentUser;
    if (!user) {
        alert('Debes iniciar sesión como administrador para eliminar un paquete.');
        const deletePackageModal = bootstrap.Modal.getInstance(document.getElementById('deletePackageModal'));
        if (deletePackageModal) {
            deletePackageModal.hide();
        }
        return;
    }
    
    try {
        // Eliminar paquete de Firestore
        await window.db.collection('packages').doc(packageId).delete();
        
        console.log("Paquete eliminado con éxito");
        
        // Cerrar modal
        const deletePackageModal = bootstrap.Modal.getInstance(document.getElementById('deletePackageModal'));
        if (deletePackageModal) {
            deletePackageModal.hide();
        }
        
        // Feedback al usuario
        alert('Paquete eliminado con éxito.');
        
        // Recargar paquetes
        loadPackages();
    } catch (error) {
        console.error('Error al eliminar paquete:', error);
        alert('Error al eliminar el paquete: ' + error.message);
    }
}

// Verificar si el usuario es administrador y mostrar opciones de administración
window.auth.onAuthStateChanged(async (user) => {
    console.log("Estado de autenticación cambiado");
    
    const adminActions = document.querySelectorAll('.admin-actions');
    const addPackageBtn = document.getElementById('add-package-btn');
    
    if (user) {
        console.log(`Usuario autenticado: ${user.email}`);
        try {
            // Verificar si el usuario es admin
            const userDoc = await window.db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log(`Rol del usuario: ${userData.role}`);
                
                if (userData.role === 'admin') {
                    // Mostrar botones de administración
                    console.log("Mostrando opciones de administrador");
                    adminActions.forEach(el => el.style.display = 'block');
                    if (addPackageBtn) addPackageBtn.style.display = 'block';
                } else {
                    // Ocultar botones de administración para no administradores
                    console.log("Usuario no es administrador, ocultando opciones");
                    adminActions.forEach(el => el.style.display = 'none');
                    if (addPackageBtn) addPackageBtn.style.display = 'none';
                }
            } else {
                console.log("Documento de usuario no encontrado");
            }
        } catch (error) {
            console.error('Error al verificar rol de usuario:', error);
        }
    } else {
        console.log("No hay usuario autenticado");
        // No hay usuario autenticado, ocultar botones de administración
        adminActions.forEach(el => el.style.display = 'none');
        if (addPackageBtn) addPackageBtn.style.display = 'none';
    }
});

// Función para crear un paquete de prueba directamente desde la consola
window.createTestPackage = async function() {
    try {
        console.log("Creando paquete de prueba...");
        
        const testPackage = {
            name: "Paquete de Prueba " + new Date().toISOString().substring(0, 10),
            destination: "Destino de Prueba",
            price: 999.99,
            duration: 5,
            description: "Este es un paquete de prueba creado directamente mediante función de depuración.",
            image: "https://placehold.co/800x500?text=Paquete+de+Prueba",
            includes: "Alojamiento, Transporte, Comidas",
            createdAt: new Date().toISOString()
        };
        
        const docRef = await window.db.collection('packages').add(testPackage);
        console.log("Paquete de prueba creado con ID:", docRef.id);
        alert("Paquete de prueba creado. ID: " + docRef.id);
        
        // Recargar paquetes
        loadPackages();
        
        return docRef.id;
    } catch (error) {
        console.error("Error al crear paquete de prueba:", error);
        alert("Error al crear paquete de prueba: " + error.message);
    }
}

// Función para verificar la estructura de Firestore
window.checkFirestore = async function() {
    console.log("Verificando Firestore...");
    try {
        // Verificar colección de packages
        const packagesSnapshot = await window.db.collection('packages').get();
        console.log(`Colección 'packages': ${packagesSnapshot.size} documentos`);
        
        // Verificar colección de users
        const usersSnapshot = await window.db.collection('users').get();
        console.log(`Colección 'users': ${usersSnapshot.size} documentos`);
        
        // Ver un documento de ejemplo de cada colección
        if (!packagesSnapshot.empty) {
            const samplePackage = packagesSnapshot.docs[0].data();
            console.log("Ejemplo de documento en 'packages':", samplePackage);
        }
        
        if (!usersSnapshot.empty) {
            const sampleUser = usersSnapshot.docs[0].data();
            console.log("Ejemplo de documento en 'users':", {
                ...sampleUser,
                email: sampleUser.email ? "***@***.com" : null // Ocultar correo por privacidad
            });
        }
        
        return {
            packagesCount: packagesSnapshot.size,
            usersCount: usersSnapshot.size
        };
    } catch (error) {
        console.error("Error al verificar Firestore:", error);
        return null;
    }
}

console.log("packages.js cargado completamente ✓");