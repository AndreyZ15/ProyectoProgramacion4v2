// news.js - Funcionalidad para gestionar noticias

document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando módulo de noticias...");
    
    // Referencias a elementos DOM
    const newsContainer = document.getElementById('news-container');
    const loadingIndicator = document.getElementById('loading-news');
    const noNewsMessage = document.getElementById('no-news-message');
    const searchInput = document.getElementById('search-news');
    const searchBtn = document.getElementById('search-news-btn');
    const sortSelect = document.getElementById('sort-news');
    const categoryButtons = document.querySelectorAll('.news-categories button');
    const addNewsBtn = document.getElementById('add-news-btn');
    
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
    
    // Referencia a colección de noticias
    const newsRef = window.db.collection('news');
    
    // Variables para almacenar y filtrar noticias
    let allNews = [];
    let filteredNews = [];
    let currentCategory = 'all';
    
    // Inicializar la página
    initPage();
    
    function initPage() {
        // Cargar noticias
        loadNews();
        
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
                // Remover clase activa de todos los botones
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                
                // Añadir clase activa al botón seleccionado
                this.classList.add('active');
                
                // Actualizar categoría actual y aplicar filtro
                currentCategory = this.dataset.category;
                applyFilters();
            });
        });
        
        // Event listener para formulario de añadir noticia
        const addNewsForm = document.getElementById('addNewsForm');
        if (addNewsForm) {
            addNewsForm.addEventListener('submit', handleAddNews);
        }
        
        // Event listener para formulario de edición
        const editNewsForm = document.getElementById('editNewsForm');
        if (editNewsForm) {
            editNewsForm.addEventListener('submit', handleEditNews);
        }
        
        // Event listener para confirmación de eliminación
        const confirmDeleteBtn = document.getElementById('confirmDeleteNewsBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeleteNews);
        }
        
        // Inicialmente ocultar botón de agregar noticia (se mostrará solo para admins)
        if (addNewsBtn) {
            addNewsBtn.style.display = 'none';
        }
    }
    
    // Función para cargar noticias desde Firestore
    async function loadNews() {
        try {
            console.log("Cargando noticias...");
            showLoading(true);
            
            // Obtener todas las noticias
            const snapshot = await newsRef.orderBy('date', 'desc').get();
            
            if (snapshot.empty) {
                console.log("No se encontraron noticias");
                allNews = [];
                showNoNewsMessage(true);
            } else {
                console.log(`Se encontraron ${snapshot.size} noticias`);
                
                // Convertir documentos a array de noticias
                allNews = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Inicializar con todas las noticias
                filteredNews = [...allNews];
                applyFilters();
            }
        } catch (error) {
            console.error("Error al cargar noticias:", error);
            showError(`Error al cargar noticias: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }
    
    // Función para aplicar filtros (búsqueda, categoría y ordenamiento)
    function applyFilters() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const sortOption = sortSelect ? sortSelect.value : 'date-desc';
        
        console.log(`Aplicando filtros: término="${searchTerm}", categoría=${currentCategory}, orden=${sortOption}`);
        
        // Filtrar por término de búsqueda y categoría
        filteredNews = allNews.filter(news => {
            // Filtro por término de búsqueda
            const matchesSearch = 
                news.title.toLowerCase().includes(searchTerm) || 
                news.summary.toLowerCase().includes(searchTerm) || 
                news.content.toLowerCase().includes(searchTerm) || 
                (news.author && news.author.toLowerCase().includes(searchTerm));
            
            // Filtro por categoría
            const matchesCategory = currentCategory === 'all' || news.category === currentCategory;
            
            return matchesSearch && matchesCategory;
        });
        
        // Aplicar ordenamiento
        switch (sortOption) {
            case 'date-desc':
                filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                filteredNews.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'title-asc':
                filteredNews.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                filteredNews.sort((a, b) => b.title.localeCompare(a.title));
                break;
        }
        
        // Mostrar noticias filtradas
        renderNews(filteredNews);
    }
    
    // Función para renderizar noticias en la página
    function renderNews(newsItems) {
        if (!newsContainer) {
            console.error("Contenedor de noticias no encontrado");
            return;
        }
        
        // Limpiar contenedor
        newsContainer.innerHTML = '';
        
        if (newsItems.length === 0) {
            showNoNewsMessage(true);
            return;
        }
        
        showNoNewsMessage(false);
        
        // Crear tarjetas para cada noticia
        newsItems.forEach(news => {
            const card = createNewsCard(news);
            newsContainer.appendChild(card);
        });
        
        console.log(`Renderizadas ${newsItems.length} noticias`);
    }
    
    // Función para crear una tarjeta de noticia
    function createNewsCard(news) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        // Formatar fecha
        const newsDate = news.date ? new Date(news.date) : new Date();
        const formattedDate = newsDate.toLocaleDateString('es-ES', {
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        });
        
        // Determinar etiqueta de categoría
        let categoryLabel = '';
        let categoryClass = '';
        
        switch(news.category) {
            case 'eventos':
                categoryLabel = 'Evento';
                categoryClass = 'bg-primary';
                break;
            case 'destinos':
                categoryLabel = 'Nuevo Destino';
                categoryClass = 'bg-success';
                break;
            case 'promociones':
                categoryLabel = 'Promoción';
                categoryClass = 'bg-danger';
                break;
            case 'consejos':
                categoryLabel = 'Consejo de Viaje';
                categoryClass = 'bg-info';
                break;
            default:
                categoryLabel = 'Noticia';
                categoryClass = 'bg-secondary';
        }
        
        // URL de imagen por defecto si no hay una
        const imageUrl = news.image || 'https://via.placeholder.com/800x400?text=Noticia';
        
        // Crear HTML de la tarjeta
        col.innerHTML = `
            <div class="card h-100 shadow-sm news-card">
                <div class="position-relative">
                    <img src="${imageUrl}" class="card-img-top" alt="${news.title}" 
                         onerror="this.src='https://via.placeholder.com/800x400?text=Imagen+No+Disponible'">
                    <span class="badge ${categoryClass} position-absolute top-0 end-0 m-2">${categoryLabel}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted"><i class="far fa-calendar-alt me-1"></i>${formattedDate}</small>
                        <small class="text-muted"><i class="far fa-user me-1"></i>${news.author || 'Admin'}</small>
                    </div>
                    <h5 class="card-title">${news.title}</h5>
                    <p class="card-text">${news.summary}</p>
                </div>
                <div class="card-footer bg-white d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary view-news" data-id="${news.id}">
                        <i class="fas fa-eye me-1"></i>Leer más
                    </button>
                    <div class="admin-actions" style="display: none;" data-news-id="${news.id}">
                        <button class="btn btn-sm btn-outline-warning edit-news" data-id="${news.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-news" data-id="${news.id}" data-title="${news.title}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir event listeners a los botones
        const viewBtn = col.querySelector('.view-news');
        const editBtn = col.querySelector('.edit-news');
        const deleteBtn = col.querySelector('.delete-news');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => openNewsDetail(news));
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditNewsModal(news));
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => openDeleteNewsModal(news));
        }
        
        return col;
    }
    
    // Función para mostrar detalle de noticia
    function openNewsDetail(news) {
        console.log(`Abriendo detalle de noticia: ${news.id}`);
        
        const detailContent = document.getElementById('newsDetailContent');
        if (!detailContent) return;
        
        // Formatear fecha
        const newsDate = news.date ? new Date(news.date) : new Date();
        const formattedDate = newsDate.toLocaleDateString('es-ES', {
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        });
        
        // Determinar etiqueta de categoría
        let categoryLabel = '';
        let categoryClass = '';
        
        switch(news.category) {
            case 'eventos':
                categoryLabel = 'Evento';
                categoryClass = 'bg-primary';
                break;
            case 'destinos':
                categoryLabel = 'Nuevo Destino';
                categoryClass = 'bg-success';
                break;
            case 'promociones':
                categoryLabel = 'Promoción';
                categoryClass = 'bg-danger';
                break;
            case 'consejos':
                categoryLabel = 'Consejo de Viaje';
                categoryClass = 'bg-info';
                break;
            default:
                categoryLabel = 'Noticia';
                categoryClass = 'bg-secondary';
        }
        
        // Imagen por defecto si no hay una
        const imageUrl = news.image || 'https://via.placeholder.com/800x400?text=Noticia';
        
        // Actualizar contenido del modal
        detailContent.innerHTML = `
            <div class="mb-4 position-relative">
                <img src="${imageUrl}" class="img-fluid rounded w-100" alt="${news.title}"
                     onerror="this.src='https://via.placeholder.com/800x400?text=Imagen+No+Disponible'">
                <span class="badge ${categoryClass} position-absolute top-0 end-0 m-3">${categoryLabel}</span>
            </div>
            <h3 class="mb-3">${news.title}</h3>
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <span class="text-muted me-3"><i class="far fa-calendar-alt me-1"></i>${formattedDate}</span>
                    <span class="text-muted"><i class="far fa-user me-1"></i>${news.author || 'Admin'}</span>
                </div>
            </div>
            <div class="news-content mb-4">
                ${formatContent(news.content)}
            </div>
        `;
        
        // Mostrar modal
        const detailModal = new bootstrap.Modal(document.getElementById('newsDetailModal'));
        detailModal.show();
    }
    
    // Función para formatear el contenido con párrafos
    function formatContent(content) {
        if (!content) return '';
        
        // Dividir por saltos de línea y convertir en párrafos
        return content.split('\n')
            .filter(paragraph => paragraph.trim() !== '')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
    }
    
    // Función para manejar la adición de una nueva noticia
    async function handleAddNews(e) {
        e.preventDefault();
        console.log("Procesando adición de noticia...");
        
        // Verificar autenticación
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para publicar una noticia.");
            return;
        }
        
        try {
            // Obtener datos del formulario
            const newsData = {
                title: document.getElementById('newsTitle').value,
                category: document.getElementById('newsCategory').value,
                date: document.getElementById('newsDate').value,
                summary: document.getElementById('newsSummary').value,
                content: document.getElementById('newsContent').value,
                image: document.getElementById('newsImage').value || null,
                author: document.getElementById('newsAuthor').value || user.email,
                createdAt: new Date().toISOString(),
                createdBy: user.uid
            };
            
            // Validaciones básicas
            if (!newsData.title || !newsData.category || !newsData.date || !newsData.summary || !newsData.content) {
                throw new Error("Por favor, completa todos los campos obligatorios.");
            }
            
            console.log("Datos de la noticia:", newsData);
            
            // Guardar en Firestore
            const docRef = await newsRef.add(newsData);
            console.log("Noticia añadida con ID:", docRef.id);
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('addNewsModal'));
            if (modal) modal.hide();
            
            document.getElementById('addNewsForm').reset();
            
            // Mostrar mensaje de éxito
            alert("Noticia publicada con éxito.");
            
            // Recargar noticias
            loadNews();
            
        } catch (error) {
            console.error("Error al publicar noticia:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Función para abrir modal de edición de noticia
    function openEditNewsModal(news) {
        console.log(`Abriendo modal de edición para noticia: ${news.id}`);
        
        // Rellenar formulario con datos de la noticia
        document.getElementById('editNewsTitle').value = news.title;
        document.getElementById('editNewsCategory').value = news.category;
        document.getElementById('editNewsDate').value = news.date;
        document.getElementById('editNewsSummary').value = news.summary;
        document.getElementById('editNewsContent').value = news.content;
        document.getElementById('editNewsImage').value = news.image || '';
        document.getElementById('editNewsAuthor').value = news.author || '';
        document.getElementById('editNewsId').value = news.id;
        
        // Mostrar modal
        const editModal = new bootstrap.Modal(document.getElementById('editNewsModal'));
        editModal.show();
    }
    
    // Función para manejar la edición de una noticia
    async function handleEditNews(e) {
        e.preventDefault();
        console.log("Procesando edición de noticia...");
        
        // Verificar autenticación
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para editar una noticia.");
            return;
        }
        
        const newsId = document.getElementById('editNewsId').value;
        
        try {
            // Obtener datos del formulario de edición
            const newsData = {
                title: document.getElementById('editNewsTitle').value,
                category: document.getElementById('editNewsCategory').value,
                date: document.getElementById('editNewsDate').value,
                summary: document.getElementById('editNewsSummary').value,
                content: document.getElementById('editNewsContent').value,
                image: document.getElementById('editNewsImage').value || null,
                author: document.getElementById('editNewsAuthor').value || user.email,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid
            };
            
            // Validaciones básicas
            if (!newsData.title || !newsData.category || !newsData.date || !newsData.summary || !newsData.content) {
                throw new Error("Por favor, completa todos los campos obligatorios.");
            }
            
            console.log("Datos actualizados:", newsData);
            
            // Actualizar en Firestore
            await newsRef.doc(newsId).update(newsData);
            console.log("Noticia actualizada con éxito");
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editNewsModal'));
            if (modal) modal.hide();
            
            // Mostrar mensaje de éxito
            alert("Noticia actualizada con éxito.");
            
            // Recargar noticias
            loadNews();
            
        } catch (error) {
            console.error("Error al actualizar noticia:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Función para abrir modal de confirmación de eliminación
    function openDeleteNewsModal(news) {
        console.log(`Confirmación para eliminar noticia: ${news.id}`);
        
        // Actualizar texto de confirmación
        document.getElementById('newsToDelete').textContent = news.title;
        
        // Configurar ID para eliminar
        document.getElementById('confirmDeleteNewsBtn').setAttribute('data-id', news.id);
        
        // Mostrar modal
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteNewsModal'));
        deleteModal.show();
    }
    
    // Función para manejar la eliminación de una noticia
    async function handleDeleteNews() {
        const newsId = document.getElementById('confirmDeleteNewsBtn').getAttribute('data-id');
        console.log(`Eliminando noticia: ${newsId}`);
        
        // Verificar autenticación
        const user = window.auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para eliminar una noticia.");
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteNewsModal'));
            if (modal) modal.hide();
            return;
        }
        
        try {
            // Eliminar de Firestore
            await newsRef.doc(newsId).delete();
            console.log("Noticia eliminada con éxito");
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteNewsModal'));
            if (modal) modal.hide();
            
            // Mostrar mensaje de éxito
            alert("Noticia eliminada con éxito.");
            
            // Recargar noticias
            loadNews();
            
        } catch (error) {
            console.error("Error al eliminar noticia:", error);
            alert("Error: " + error.message);
        }
    }
    
    // Funciones de utilidad para mostrar/ocultar elementos
    function showLoading(show) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
        if (newsContainer) newsContainer.style.display = show ? 'none' : 'flex';
    }
    
    function showNoNewsMessage(show) {
        if (noNewsMessage) noNewsMessage.style.display = show ? 'block' : 'none';
    }
    
    function showError(message) {
        if (newsContainer) {
            newsContainer.innerHTML = `
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
                // Verificar rol de usuario
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log(`Rol del usuario: ${userData.role}`);
                    
                    if (userData.role === 'admin') {
                        console.log("Usuario es administrador - mostrando opciones de gestión");
                        // Mostrar botón de añadir noticia
                        if (addNewsBtn) addNewsBtn.style.display = 'inline-block';
                        
                        // Mostrar botones de edición/eliminación
                        adminActions.forEach(el => el.style.display = 'block');
                    } else {
                        console.log("Usuario no es administrador - ocultando opciones de gestión");
                        if (addNewsBtn) addNewsBtn.style.display = 'none';
                        adminActions.forEach(el => el.style.display = 'none');
                    }
                } else {
                    console.log("Documento de usuario no encontrado");
                    if (addNewsBtn) addNewsBtn.style.display = 'none';
                    adminActions.forEach(el => el.style.display = 'none');
                }
            } catch (error) {
                console.error("Error al verificar rol de usuario:", error);
                if (addNewsBtn) addNewsBtn.style.display = 'none';
                adminActions.forEach(el => el.style.display = 'none');
            }
        } else {
            console.log("No hay usuario autenticado");
            if (addNewsBtn) addNewsBtn.style.display = 'none';
            adminActions.forEach(el => el.style.display = 'none');
        }
    });
    
    // Crear noticia de ejemplo para depuración
    window.createSampleNews = async function() {
        if (!window.db) {
            alert("Error: Firestore no está disponible");
            return;
        }
        
        try {
            const sampleNews = {
                title: "Nuevo destino: Islas Maldivas",
                category: "destinos",
                date: new Date().toISOString().split('T')[0],
                summary: "Descubre nuestros nuevos paquetes a las paradisíacas Islas Maldivas con precios especiales de lanzamiento.",
                content: "¡Nos complace anunciar la incorporación de las Islas Maldivas a nuestro catálogo de destinos!\n\nEste paraíso en el Océano Índico es famoso por sus aguas cristalinas, arrecifes de coral y bungalows sobre el agua. Ahora puedes disfrutar de esta experiencia única con nuestros paquetes especialmente diseñados para diferentes tipos de viajeros.\n\nNuestros paquetes incluyen vuelos internacionales, traslados en lancha rápida o hidroavión, alojamiento en resorts de lujo y diversas actividades acuáticas como snorkel y buceo.\n\nReserva antes del 30 de junio y obtén un 15% de descuento en cualquiera de nuestros paquetes a Maldivas.",
                image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
                author: "Equipo de Destinos",
                createdAt: new Date().toISOString(),
                createdBy: "admin"
            };
            
            const docRef = await window.db.collection('news').add(sampleNews);
            console.log("Noticia de ejemplo creada con ID:", docRef.id);
            alert("Noticia de ejemplo creada con éxito. Recarga la página para verla.");
            
            return docRef.id;
        } catch (error) {
            console.error("Error al crear noticia de ejemplo:", error);
            alert("Error: " + error.message);
        }
    };
});