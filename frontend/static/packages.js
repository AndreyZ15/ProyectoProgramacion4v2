// packages.js - Funcionalidad para gestionar paquetes turísticos

document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando módulo de paquetes...");
    
    // Referencias a elementos DOM
    const packagesContainer = document.getElementById('packages-container');
    const loadingIndicator = document.getElementById('loading-packages');
    const noPackagesMessage = document.getElementById('no-packages-message');
    const searchInput = document.getElementById('search-packages');
    const searchBtn = document.getElementById('search-packages-btn');
    const sortSelect = document.getElementById('sort-packages');
    const categoryButtons = document.querySelectorAll('.package-categories button');
    const addPackageBtn = document.getElementById('add-package-btn');
    
    // Verificar Firebase
    if (!window.firebase) {
        console.error("Firebase no está disponible");
        showError("Error: Firebase no está disponible. Verifica la conexión a internet.");
        return;
    }
    
    if (!window.db) {
        console.error("Firestore (db) no está disponible");
        showError("Error: La base de datos no está disponible.");
        return;
    }
    
    console.log("Firebase y Firestore disponibles ✓");
    
    // Referencia a colección de paquetes
    const packagesRef = window.db.collection('packages');
    
    // Variables para almacenar y filtrar paquetes
    let allPackages = [];
    let filteredPackages = [];
    let currentCategory = 'all';
    let currentPackageId = null; // Para rastrear el paquete en el modal de detalles
    
    // Inicializar la página
    initPage();
    
    function initPage() {
        // Cargar paquetes
        loadPackages();
        
        // Configurar event listeners
        if (searchBtn) {
            searchBtn.addEventListener('click', applyFilters);
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', applyFilters);
        }
        
        // Event listeners para filtrar por categoría
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                applyFilters();
            });
        });
        
        // Event listener para formulario de añadir paquete
        const addPackageForm = document.getElementById('addPackageForm');
        if (addPackageForm) {
            addPackageForm.addEventListener('submit', handleAddPackage);
        }
        
        // Event listener para formulario de edición
        const editPackageForm = document.getElementById('editPackageForm');
        if (editPackageForm) {
            editPackageForm.addEventListener('submit', handleEditPackage);
        }
        
        // Event listener para confirmación de eliminación
        const confirmDeleteBtn = document.getElementById('confirmDeletePackageBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeletePackage);
        }
        
        // Event listener para formulario de añadir comentario
        const addCommentForm = document.getElementById('addCommentForm');
        if (addCommentForm) {
            addCommentForm.addEventListener('submit', handleAddComment);
        }
        
        // Configurar estrellas de calificación
        const stars = document.querySelectorAll('#commentRating .fa-star');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.value);
                document.getElementById('commentRatingValue').value = rating;
                stars.forEach(s => {
                    s.classList.remove('text-warning');
                    if (parseInt(s.dataset.value) <= rating) {
                        s.classList.add('text-warning');
                    }
                });
            });
        });
        
        // Inicialmente ocultar botón de agregar paquete (se mostrará solo para admins)
        if (addPackageBtn) {
            addPackageBtn.style.display = 'none';
        }
    }
    
    // Función para cargar paquetes desde Firestore
    async function loadPackages() {
        try {
            console.log("Cargando paquetes...");
            showLoading(true);
            
            const snapshot = await packagesRef.get();
            
            if (snapshot.empty) {
                console.log("No se encontraron paquetes");
                allPackages = [];
                showNoPackagesMessage(true);
            } else {
                console.log(`Se encontraron ${snapshot.size} paquetes`);
                allPackages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                filteredPackages = [...allPackages];
                applyFilters();
            }
        } catch (error) {
            console.error("Error al cargar paquetes:", error);
            showError(`Error al cargar paquetes: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }
    
    // Función para aplicar filtros (búsqueda, categoría y ordenamiento)
    function applyFilters() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const sortOption = sortSelect ? sortSelect.value : 'price-asc';
        
        console.log(`Aplicando filtros: término="${searchTerm}", categoría=${currentCategory}, orden=${sortOption}`);
        
        filteredPackages = allPackages.filter(package => {
            // Asegurarnos de que las propiedades existan, si no, usar cadena vacía
            const title = package.title || '';
            const summary = package.summary || '';
            const content = package.content || '';
            
            const matchesSearch = 
                title.toLowerCase().includes(searchTerm) || 
                summary.toLowerCase().includes(searchTerm) || 
                content.toLowerCase().includes(searchTerm);
            const matchesCategory = currentCategory === 'all' || package.category === currentCategory;
            return matchesSearch && matchesCategory;
        });
        
        switch (sortOption) {
            case 'price-asc':
                filteredPackages.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-desc':
                filteredPackages.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'title-asc':
                filteredPackages.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title-desc':
                filteredPackages.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
        }
        
        renderPackages(filteredPackages);
    }
    
    // Función para renderizar paquetes en la página
    function renderPackages(packageItems) {
        if (!packagesContainer) {
            console.error("Contenedor de paquetes no encontrado");
            return;
        }
        
        packagesContainer.innerHTML = '';
        
        if (packageItems.length === 0) {
            showNoPackagesMessage(true);
            return;
        }
        
        showNoPackagesMessage(false);
        
        packageItems.forEach(pkg => {
            const card = createPackageCard(pkg);
            packagesContainer.appendChild(card);
        });
        
        console.log(`Renderizados ${packageItems.length} paquetes`);
    }
    
    // Función para crear una tarjeta de paquete (similar a las noticias)
    function createPackageCard(pkg) {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        
        let categoryLabel = '';
        let categoryClass = '';
        
        switch(pkg.category) {
            case 'playa':
                categoryLabel = 'Playa';
                categoryClass = 'bg-primary';
                break;
            case 'montaña':
                categoryLabel = 'Montaña';
                categoryClass = 'bg-success';
                break;
            case 'ciudad':
                categoryLabel = 'Ciudad';
                categoryClass = 'bg-danger';
                break;
            case 'aventura':
                categoryLabel = 'Aventura';
                categoryClass = 'bg-info';
                break;
            default:
                categoryLabel = 'Paquete';
                categoryClass = 'bg-secondary';
        }
        
        const imageUrl = pkg.image || 'https://via.placeholder.com/800x400?text=Paquete';
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm package-card">
                <div class="position-relative">
                    <img src="${imageUrl}" class="card-img-top" alt="${pkg.title || 'Paquete sin título'}" 
                         onerror="this.src='https://via.placeholder.com/800x400?text=Imagen+No+Disponible'">
                    <span class="badge ${categoryClass} position-absolute top-0 end-0 m-2">${categoryLabel}</span>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${pkg.title || 'Sin título'}</h5>
                    <p class="card-text">${pkg.summary || 'Sin resumen'}</p>
                    <p class="text-muted"><strong>Precio: $${pkg.price || 0} USD</strong></p>
                </div>
                <div class="card-footer bg-white d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary view-package" data-id="${pkg.id}">
                        <i class="fas fa-eye me-1"></i>Ver Detalles
                    </button>
                    <div class="admin-actions" style="display: none;" data-package-id="${pkg.id}">
                        <button class="btn btn-sm btn-outline-warning edit-package" data-id="${pkg.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-package" data-id="${pkg.id}" data-title="${pkg.title || 'Sin título'}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const viewBtn = col.querySelector('.view-package');
        const editBtn = col.querySelector('.edit-package');
        const deleteBtn = col.querySelector('.delete-package');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => openPackageDetail(pkg));
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditPackageModal(pkg));
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => openDeletePackageModal(pkg));
        }
        
        return col;
    }
    
    // Función para mostrar detalle de paquete
    async function openPackageDetail(pkg) {
        console.log(`Abriendo detalle de paquete: ${pkg.id}`);
        currentPackageId = pkg.id;
        
        const detailContent = document.getElementById('packageDetailContent');
        if (!detailContent) return;
        
        let categoryLabel = '';
        let categoryClass = '';
        
        switch(pkg.category) {
            case 'playa':
                categoryLabel = 'Playa';
                categoryClass = 'bg-primary';
                break;
            case 'montaña':
                categoryLabel = 'Montaña';
                categoryClass = 'bg-success';
                break;
            case 'ciudad':
                categoryLabel = 'Ciudad';
                categoryClass = 'bg-danger';
                break;
            case 'aventura':
                categoryLabel = 'Aventura';
                categoryClass = 'bg-info';
                break;
            default:
                categoryLabel = 'Paquete';
                categoryClass = 'bg-secondary';
        }
        
        const imageUrl = pkg.image || 'https://via.placeholder.com/800x400?text=Paquete';
        
        detailContent.innerHTML = `
            <div class="mb-4 position-relative">
                <img src="${imageUrl}" class="img-fluid rounded w-100" alt="${pkg.title || 'Paquete sin título'}"
                     onerror="this.src='https://via.placeholder.com/800x400?text=Imagen+No+Disponible'">
                <span class="badge ${categoryClass} position-absolute top-0 end-0 m-3">${categoryLabel}</span>
            </div>
            <h3 class="mb-3">${pkg.title || 'Sin título'}</h3>
            <div class="mb-4">
                <p class="text-muted mb-1"><strong>Precio: $${pkg.price || 0} USD</strong></p>
            </div>
            <div class="package-content mb-4">
                ${formatContent(pkg.content || 'Sin descripción')}
            </div>
        `;
        
        // Cargar comentarios
        await loadComments(pkg.id);
        
        // Mostrar u ocultar botón de agregar comentario según autenticación
        const addCommentBtn = document.getElementById('add-comment-btn');
        if (addCommentBtn) {
            addCommentBtn.style.display = window.auth.currentUser ? 'inline-block' : 'none';
        }
        
        const detailModal = new bootstrap.Modal(document.getElementById('packageDetailModal'));
        detailModal.show();
    }
    
    // Función para cargar comentarios de un paquete
    async function loadComments(packageId) {
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) return;
        
        commentsContainer.innerHTML = '<p>Cargando comentarios...</p>';
        
        try {
            const commentsSnapshot = await packagesRef.doc(packageId).collection('comments').orderBy('createdAt', 'desc').get();
            
            if (commentsSnapshot.empty) {
                commentsContainer.innerHTML = '<p>No hay comentarios aún. ¡Sé el primero en comentar!</p>';
                return;
            }
            
            commentsContainer.innerHTML = '';
            commentsSnapshot.forEach(doc => {
                const comment = doc.data();
                const commentDate = new Date(comment.createdAt);
                const formattedDate = commentDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
                
                const starsHtml = Array(5).fill().map((_, i) => {
                    return `<i class="fas fa-star ${i < comment.rating ? 'text-warning' : 'text-muted'}"></i>`;
                }).join('');
                
                const commentHtml = `
                    <div class="border-bottom py-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <strong>${comment.userEmail}</strong>
                                <div>${starsHtml}</div>
                            </div>
                            <small class="text-muted">${formattedDate}</small>
                        </div>
                        <p>${comment.comment}</p>
                    </div>
                `;
                commentsContainer.innerHTML += commentHtml;
            });
        } catch (error) {
            console.error("Error al cargar comentarios:", error);
            commentsContainer.innerHTML = '<p>Error al cargar comentarios.</p>';
        }
    }
    
    // Función para manejar la adición de un comentario
    async function handleAddComment(e) {
        e.preventDefault();
        console.log("Procesando adición de comentario...");
        
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para dejar un comentario.");
            return;
        }
        
        try {
            const commentData = {
                rating: parseInt(document.getElementById('commentRatingValue').value),
                comment: document.getElementById('commentText').value,
                userId: user.uid,
                userEmail: user.email,
                createdAt: new Date().toISOString()
            };
            
            if (!commentData.rating || commentData.rating < 1 || commentData.rating > 5) {
                throw new Error("Por favor, selecciona una calificación entre 1 y 5 estrellas.");
            }
            
            if (!commentData.comment.trim()) {
                throw new Error("El comentario no puede estar vacío.");
            }
            
            await packagesRef.doc(currentPackageId).collection('comments').add(commentData);
            alert("Comentario agregado con éxito.");
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCommentModal'));
            if (modal) modal.hide();
            
            document.getElementById('addCommentForm').reset();
            document.querySelectorAll('#commentRating .fa-star').forEach(star => star.classList.remove('text-warning'));
            document.getElementById('commentRatingValue').value = '0';
            
            await loadComments(currentPackageId);
        } catch (error) {
            console.error("Error al agregar comentario:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Función para formatear el contenido con párrafos
    function formatContent(content) {
        if (!content) return '';
        return content.split('\n')
            .filter(paragraph => paragraph.trim() !== '')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
    }
    
    // Función para manejar la adición de un nuevo paquete
    async function handleAddPackage(e) {
        e.preventDefault();
        console.log("Procesando adición de paquete...");
        
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para agregar un paquete.");
            return;
        }
        
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            alert("No tienes permisos para realizar esta acción.");
            return;
        }
        
        try {
            const packageData = {
                title: document.getElementById('packageTitle').value,
                category: document.getElementById('packageCategory').value,
                price: parseFloat(document.getElementById('packagePrice').value),
                summary: document.getElementById('packageSummary').value,
                content: document.getElementById('packageContent').value,
                image: document.getElementById('packageImage').value || null,
                createdAt: new Date().toISOString(),
                createdBy: user.uid
            };
            
            if (!packageData.title || !packageData.category || !packageData.price || !packageData.summary || !packageData.content) {
                throw new Error("Por favor, completa todos los campos obligatorios.");
            }
            
            const docRef = await packagesRef.add(packageData);
            console.log("Paquete añadido con ID:", docRef.id);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPackageModal'));
            if (modal) modal.hide();
            
            document.getElementById('addPackageForm').reset();
            alert("Paquete agregado con éxito.");
            loadPackages();
        } catch (error) {
            console.error("Error al agregar paquete:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Función para abrir modal de edición de paquete
    function openEditPackageModal(pkg) {
        console.log(`Abriendo modal de edición para paquete: ${pkg.id}`);
        
        document.getElementById('editPackageTitle').value = pkg.title || '';
        document.getElementById('editPackageCategory').value = pkg.category || '';
        document.getElementById('editPackagePrice').value = pkg.price || '';
        document.getElementById('editPackageSummary').value = pkg.summary || '';
        document.getElementById('editPackageContent').value = pkg.content || '';
        document.getElementById('editPackageImage').value = pkg.image || '';
        document.getElementById('editPackageId').value = pkg.id;
        
        const editModal = new bootstrap.Modal(document.getElementById('editPackageModal'));
        editModal.show();
    }
    
    // Función para manejar la edición de un paquete
    async function handleEditPackage(e) {
        e.preventDefault();
        console.log("Procesando edición de paquete...");
        
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para editar un paquete.");
            return;
        }
        
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            alert("No tienes permisos para realizar esta acción.");
            return;
        }
        
        const packageId = document.getElementById('editPackageId').value;
        
        try {
            const packageData = {
                title: document.getElementById('editPackageTitle').value,
                category: document.getElementById('editPackageCategory').value,
                price: parseFloat(document.getElementById('editPackagePrice').value),
                summary: document.getElementById('editPackageSummary').value,
                content: document.getElementById('editPackageContent').value,
                image: document.getElementById('editPackageImage').value || null,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid
            };
            
            if (!packageData.title || !packageData.category || !packageData.price || !packageData.summary || !packageData.content) {
                throw new Error("Por favor, completa todos los campos obligatorios.");
            }
            
            await packagesRef.doc(packageId).update(packageData);
            console.log("Paquete actualizado con éxito");
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPackageModal'));
            if (modal) modal.hide();
            
            alert("Paquete actualizado con éxito.");
            loadPackages();
        } catch (error) {
            console.error("Error al actualizar paquete:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Función para abrir modal de confirmación de eliminación
    function openDeletePackageModal(pkg) {
        console.log(`Confirmación para eliminar paquete: ${pkg.id}`);
        
        document.getElementById('packageToDelete').textContent = pkg.title || 'Sin título';
        document.getElementById('confirmDeletePackageBtn').setAttribute('data-id', pkg.id);
        
        const deleteModal = new bootstrap.Modal(document.getElementById('deletePackageModal'));
        deleteModal.show();
    }
    
    // Función para manejar la eliminación de un paquete
    async function handleDeletePackage() {
        const packageId = document.getElementById('confirmDeletePackageBtn').getAttribute('data-id');
        console.log(`Eliminando paquete: ${packageId}`);
        
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para eliminar un paquete.");
            const modal = bootstrap.Modal.getInstance(document.getElementById('deletePackageModal'));
            if (modal) modal.hide();
            return;
        }
        
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            alert("No tienes permisos para realizar esta acción.");
            const modal = bootstrap.Modal.getInstance(document.getElementById('deletePackageModal'));
            if (modal) modal.hide();
            return;
        }
        
        try {
            await packagesRef.doc(packageId).delete();
            console.log("Paquete eliminado con éxito");
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deletePackageModal'));
            if (modal) modal.hide();
            
            alert("Paquete eliminado con éxito.");
            loadPackages();
        } catch (error) {
            console.error("Error al eliminar paquete:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Funciones de utilidad para mostrar/ocultar elementos
    function showLoading(show) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
        if (packagesContainer) packagesContainer.style.visibility = show ? 'hidden' : 'visible';
    }
    
    function showNoPackagesMessage(show) {
        if (noPackagesMessage) noPackagesMessage.style.display = show ? 'block' : 'none';
    }
    
    function showError(message) {
        if (packagesContainer) {
            packagesContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>${message}
                    </div>
                </div>
            `;
        } else {
            alert(message);
        }
    }
    
    // Verificar si el usuario tiene permisos de administrador para mostrar opciones de gestión
    window.auth.onAuthStateChanged(async (user) => {
        console.log("Estado de autenticación cambiado");
        
        const adminActions = document.querySelectorAll('.admin-actions');
        
        if (user) {
            console.log(`Usuario autenticado: ${user.email}`);
            
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log(`Rol del usuario: ${userData.role}`);
                    
                    if (userData.role === 'admin') {
                        console.log("Usuario es administrador - mostrando opciones de gestión");
                        if (addPackageBtn) addPackageBtn.style.display = 'inline-block';
                        adminActions.forEach(el => el.style.display = 'block');
                    } else {
                        console.log("Usuario no es administrador - ocultando opciones de gestión");
                        if (addPackageBtn) addPackageBtn.style.display = 'none';
                        adminActions.forEach(el => el.style.display = 'none');
                    }
                } else {
                    console.log("Documento de usuario no encontrado");
                    if (addPackageBtn) addPackageBtn.style.display = 'none';
                    adminActions.forEach(el => el.style.display = 'none');
                }
            } catch (error) {
                console.error("Error al verificar rol de usuario:", error);
                if (addPackageBtn) addPackageBtn.style.display = 'none';
                adminActions.forEach(el => el.style.display = 'none');
            }
        } else {
            console.log("No hay usuario autenticado");
            if (addPackageBtn) addPackageBtn.style.display = 'none';
            adminActions.forEach(el => el.style.display = 'none');
        }
    });
    
    // Crear paquete de ejemplo para depuración
    window.createSamplePackage = async function() {
        if (!window.db) {
            alert("Error: Firestore no está disponible");
            return;
        }
        
        try {
            const samplePackage = {
                title: "Escapada a la Playa en Cancún",
                category: "playa",
                price: 1200,
                summary: "Disfruta de 5 días y 4 noches en las playas de Cancún con todo incluido.",
                content: "¡Vive una experiencia inolvidable en Cancún!\n\nEste paquete incluye vuelos redondos, hospedaje en un resort de 5 estrellas con plan todo incluido, actividades acuáticas y una excursión a las ruinas mayas de Chichén Itzá.\n\nPerfecto para familias, parejas o amigos que buscan relajarse y divertirse bajo el sol del Caribe.",
                image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
                createdAt: new Date().toISOString(),
                createdBy: "admin"
            };
            
            const docRef = await window.db.collection('packages').add(samplePackage);
            console.log("Paquete de ejemplo creado con ID:", docRef.id);
            alert("Paquete de ejemplo creado con éxito. Recarga la página para verlo.");
            
            return docRef.id;
        } catch (error) {
            console.error("Error al crear paquete de ejemplo:", error);
            alert("Error: " + error.message);
        }
    };
});