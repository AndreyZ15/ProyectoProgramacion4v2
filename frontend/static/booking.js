// booking.js - Versión mejorada para solucionar problemas específicos
console.log("booking.js cargado");

// Variables globales
let selectedDate = null;
let selectedPackage = null;
let calendar = null;
let packageData = {};
let availabilityData = {};
let firebaseInitialized = false;

// Evento principal al cargar la página
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM cargado, iniciando sistema de reservas");
    
    // Inicializar calendario de inmediato
    initCalendar();
    
    // Verificar Firebase cada 100ms hasta que esté disponible
    checkFirebaseInit();
});

// Verificar inicialización de Firebase de forma más agresiva
function checkFirebaseInit() {
    console.log("Intentando verificar Firebase...");
    
    // Si Firebase no está disponible después de 100ms, intentar nuevamente
    const checkInterval = setInterval(() => {
        // Primero verificar si las variables globales están disponibles
        if (typeof firebase !== 'undefined') {
            console.log("Firebase está disponible como variable global");
            
            // Verificar si Firestore está disponible
            if (firebase.firestore) {
                console.log("Firestore está disponible");
                
                // Establecer referencias globales
                window.db = firebase.firestore();
                console.log("Base de datos Firestore inicializada:", window.db);
                
                window.auth = firebase.auth();
                console.log("Autenticación Firebase inicializada:", window.auth);
                
                // Marcar como inicializado y limpiar intervalo
                firebaseInitialized = true;
                clearInterval(checkInterval);
                
                // Cargar paquetes y configurar eventos
                console.log("Cargando paquetes desde Firestore...");
                loadPackagesDirectly();
                setupEventListeners();
            } else {
                console.log("Esperando Firestore...");
            }
        } else {
            console.log("Esperando Firebase...");
            
            // Intentar encontrar Firebase en window
            if (window.firebase) {
                console.log("Firebase encontrado en window");
                
                if (window.firebase.firestore) {
                    console.log("Firestore encontrado en window.firebase");
                    
                    // Establecer referencias
                    window.db = window.firebase.firestore();
                    window.auth = window.firebase.auth();
                    
                    // Marcar como inicializado y limpiar intervalo
                    firebaseInitialized = true;
                    clearInterval(checkInterval);
                    
                    // Cargar paquetes y configurar eventos
                    loadPackagesDirectly();
                    setupEventListeners();
                }
            }
        }
    }, 100);
    
    // Configurar un timeout si Firebase nunca se inicializa
    setTimeout(() => {
        if (!firebaseInitialized) {
            clearInterval(checkInterval);
            console.error("Error: Firebase no se pudo inicializar después de 10 segundos");
            alert("Error: No se pudo conectar con la base de datos. Por favor, recarga la página.");
        }
    }, 10000);
}

// Usar un enfoque directo para cargar paquetes
function loadPackagesDirectly() {
    console.log("Intentando cargar paquetes directamente...");
    
    const packageSelect = document.getElementById("package-select");
    if (!packageSelect) {
        console.error("Error: No se encontró el elemento select para paquetes");
        return;
    }
    
    console.log("Elemento select encontrado:", packageSelect);
    
    // Limpiar options existentes excepto el primero (placeholder)
    while (packageSelect.options.length > 1) {
        packageSelect.remove(1);
    }
    
    // Intentar usar Firestore para cargar paquetes
    try {
        console.log("Intentando acceder a la colección 'packages'...");
        
        // Verificar una vez más que db está disponible
        if (!window.db) {
            console.error("Error: window.db no está disponible");
            
            // Intentar obtener db directamente
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                window.db = firebase.firestore();
                console.log("Base de datos recuperada en último intento:", window.db);
            } else {
                alert("Error: No se pudo acceder a la base de datos. Esto puede deberse a problemas de conexión o inicialización.");
                return;
            }
        }
        
        // Intentar obtener documentos de la colección "packages"
        window.db.collection("packages").get()
            .then(snapshot => {
                console.log(`Respuesta recibida de Firestore. Documentos: ${snapshot.size}`);
                
                // Verificar si hay documentos
                if (snapshot.empty) {
                    console.log("No se encontraron paquetes en la base de datos");
                    const option = document.createElement("option");
                    option.textContent = "No hay paquetes disponibles";
                    packageSelect.appendChild(option);
                    return;
                }
                
                // Agregar cada paquete al select
                let contador = 0;
                snapshot.forEach(doc => {
                    contador++;
                    console.log(`Procesando paquete ${contador} con ID: ${doc.id}`);
                    
                    const data = doc.data();
                    console.log("Datos del paquete:", data);
                    
                    // Crear y agregar option
                    const option = document.createElement("option");
                    option.value = doc.id;
                    option.textContent = `${data.title || 'Sin título'} - $${data.price}`;
                    packageSelect.appendChild(option);
                    
                    // Guardar datos del paquete en memoria
                    packageData[doc.id] = {
                        name: data.title || 'Sin título',
                        price: data.price || 0,
                        description: data.content || data.summary || "No hay descripción disponible",
                        duration: data.duration || "Duración a consultar",
                        image: data.image || "https://via.placeholder.com/300x200?text=Sin+imagen"
                    };
                });
                
                console.log("Total de paquetes procesados:", contador);
                console.log("Datos de paquetes en memoria:", packageData);
                
                // Generar disponibilidad para los paquetes
                loadAvailability();
                
                // Verificar si hay un paquete preseleccionado en la URL
                const urlParams = getUrlParameters();
                if (urlParams.package) {
                    // Buscar el paquete en las opciones
                    let packageExists = false;
                    for (let i = 0; i < packageSelect.options.length; i++) {
                        if (packageSelect.options[i].value === urlParams.package) {
                            packageExists = true;
                            break;
                        }
                    }
                    
                    if (packageExists) {
                        packageSelect.value = urlParams.package;
                        updatePackageDetails(urlParams.package);
                        
                        // Si hay fecha en la URL, intentar seleccionarla
                        if (urlParams.date) {
                            setTimeout(() => {
                                if (availabilityData[urlParams.package] && availabilityData[urlParams.package][urlParams.date]) {
                                    selectDate(urlParams.date, availabilityData[urlParams.package][urlParams.date]);
                                    calendar.gotoDate(urlParams.date);
                                } else {
                                    calendar.gotoDate(urlParams.date);
                                }
                            }, 500);
                        }
                    }
                }
            })
            .catch(error => {
                console.error("Error al obtener paquetes de Firestore:", error);
                alert("Error al cargar paquetes: " + error.message);
                
                // Agregar opción de error
                const option = document.createElement("option");
                option.textContent = "Error al cargar paquetes";
                packageSelect.appendChild(option);
            });
    } catch (e) {
        console.error("Error crítico al intentar cargar paquetes:", e);
        alert("Error crítico: " + e.message);
    }
}

// Inicializar calendario
function initCalendar() {
    console.log("Inicializando calendario...");
    
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
        console.error("Elemento de calendario no encontrado");
        return;
    }
    
    try {
        // Verificar que FullCalendar esté disponible
        if (typeof FullCalendar === 'undefined') {
            console.error("Error: FullCalendar no está disponible");
            return;
        }
        
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            selectable: true,
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth"
            },
            eventClick: function(info) {
                selectDate(info.event.startStr, info.event.extendedProps.spots);
            },
            dateClick: function(info) {
                const clickedDate = info.dateStr;
                console.log("Fecha seleccionada:", clickedDate);
                
                if (selectedPackage && availabilityData[selectedPackage] && availabilityData[selectedPackage][clickedDate]) {
                    selectDate(clickedDate, availabilityData[selectedPackage][clickedDate]);
                } else {
                    document.getElementById("selected-date").value = "";
                    document.getElementById("available-spots").value = "No disponible";
                    document.getElementById("continue-to-payment").disabled = true;
                }
            },
            validRange: function() {
                return {
                    start: new Date()
                };
            }
        });
        
        calendar.render();
        console.log("Calendario renderizado correctamente");
    } catch (e) {
        console.error("Error al inicializar el calendario:", e);
        alert("Error al inicializar el calendario: " + e.message);
    }
}

// Cargar disponibilidad
function loadAvailability() {
    console.log("Generando datos de disponibilidad...");
    
    // Obtener IDs de paquetes
    const packageIds = Object.keys(packageData);
    console.log("Paquetes para generar disponibilidad:", packageIds);
    
    if (packageIds.length === 0) {
        console.warn("No hay paquetes disponibles para generar disponibilidad");
        return;
    }
    
    // Para cada paquete, generar disponibilidad simulada
    packageIds.forEach(packageId => {
        availabilityData[packageId] = {};
        
        // Generar fechas disponibles para los próximos 3 meses
        const today = new Date();
        for (let i = 1; i <= 90; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            
            // Solo algunas fechas tendrán disponibilidad (cada 3-7 días)
            if (i % Math.floor(Math.random() * 5 + 3) === 0) {
                const dateString = futureDate.toISOString().split('T')[0];
                // Disponibilidad aleatoria entre 2 y 20 cupos
                availabilityData[packageId][dateString] = Math.floor(Math.random() * 19 + 2);
            }
        }
    });
    
    console.log("Disponibilidad generada:", availabilityData);
}

// Obtener eventos para el calendario
function getAvailableEvents(packageId) {
    console.log("Generando eventos para el calendario. Paquete:", packageId);
    
    const events = [];
    
    if (!availabilityData[packageId]) {
        console.warn("No hay datos de disponibilidad para el paquete:", packageId);
        return events;
    }
    
    // Convertir datos de disponibilidad a eventos
    for (const [date, spots] of Object.entries(availabilityData[packageId])) {
        if (spots > 0) {
            events.push({
                title: `${spots} cupos`,
                start: date,
                spots: spots,
                backgroundColor: spots < 5 ? "#ffc107" : "#28a745",
                borderColor: spots < 5 ? "#ffc107" : "#28a745",
                textColor: spots < 5 ? "#000" : "#fff"
            });
        }
    }
    
    console.log(`Se generaron ${events.length} eventos para el calendario`);
    return events;
}

// Configurar event listeners
function setupEventListeners() {
    console.log("Configurando event listeners...");
    
    // Evento de cambio de paquete
    const packageSelect = document.getElementById("package-select");
    if (packageSelect) {
        packageSelect.addEventListener("change", function() {
            const selectedPkg = this.value;
            console.log("Paquete seleccionado:", selectedPkg);
            
            if (selectedPkg) {
                updatePackageDetails(selectedPkg);
            } else {
                document.getElementById("selected-package-details").classList.add("d-none");
            }
        });
        console.log("Event listener configurado para cambio de paquete");
    } else {
        console.warn("No se encontró el elemento select de paquetes");
    }
    
    // Evento de cambio en número de tickets
    const numTicketsInput = document.getElementById("num-tickets");
    if (numTicketsInput) {
        numTicketsInput.addEventListener("change", function() {
            const numTickets = parseInt(this.value);
            const availableSpots = document.getElementById("available-spots").value;
            
            if (availableSpots && parseInt(availableSpots) < numTickets) {
                document.getElementById("continue-to-payment").disabled = true;
                alert("El número de personas excede los cupos disponibles para esta fecha.");
            } else if (selectedDate) {
                document.getElementById("continue-to-payment").disabled = false;
            }
            
            updateTotalPrice();
        });
        console.log("Event listener configurado para cambio de número de tickets");
    }
    
    // Botón de continuación al pago
    const continueToPaymentBtn = document.getElementById("continue-to-payment");
    if (continueToPaymentBtn) {
        continueToPaymentBtn.addEventListener("click", function() {
            if (!selectedPackage || !selectedDate || !document.getElementById("num-tickets").value) {
                alert("Por favor completa todos los campos requeridos.");
                return;
            }
            
            const numTickets = document.getElementById("num-tickets").value;
            const totalPrice = document.getElementById("total-price").value;
            const packageName = packageData[selectedPackage].name;
            
            // Actualizar resumen en modal
            document.getElementById("summary-package").textContent = packageName;
            document.getElementById("summary-date").textContent = selectedDate;
            document.getElementById("summary-tickets").textContent = numTickets;
            document.getElementById("summary-price").textContent = totalPrice;
            
            // Mostrar modal de pago
            const paymentModal = new bootstrap.Modal(document.getElementById("payment-modal"));
            paymentModal.show();
        });
        console.log("Event listener configurado para continuar al pago");
    }
    
    // Manejar el formulario de pago
    const paymentForm = document.getElementById("payment-form");
    if (paymentForm) {
        paymentForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector("button[type='submit']");
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
            
            setTimeout(function() {
                // Cerrar modal de pago
                bootstrap.Modal.getInstance(document.getElementById("payment-modal")).hide();
                
                // Generar número de confirmación
                const confirmationNumber = "CONF-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                document.getElementById("confirmation-number").textContent = confirmationNumber;
                
                // Actualizar disponibilidad
                if (availabilityData[selectedPackage] && availabilityData[selectedPackage][selectedDate]) {
                    const numTickets = parseInt(document.getElementById("num-tickets").value);
                    availabilityData[selectedPackage][selectedDate] -= numTickets;
                    
                    if (availabilityData[selectedPackage][selectedDate] <= 0) {
                        delete availabilityData[selectedPackage][selectedDate];
                    }
                    
                    // Actualizar calendario
                    if (calendar) {
                        calendar.removeAllEvents();
                        calendar.addEventSource(getAvailableEvents(selectedPackage));
                    }
                }
                
                // Guardar reserva si el usuario está autenticado
                if (window.auth && window.auth.currentUser) {
                    const user = window.auth.currentUser;
                    window.db.collection("reservations").add({
                        userId: user.uid,
                        packageId: selectedPackage,
                        packageName: packageData[selectedPackage].name,
                        date: selectedDate,
                        tickets: parseInt(document.getElementById("num-tickets").value),
                        totalPrice: parseFloat(document.getElementById("total-price").value.replace("$", "")),
                        confirmationNumber: confirmationNumber,
                        createdAt: new Date(),
                        status: "confirmed"
                    })
                    .then(() => {
                        console.log("Reserva guardada correctamente");
                    })
                    .catch(error => {
                        console.error("Error al guardar reserva:", error);
                    });
                }
                
                // Mostrar modal de confirmación
                const confirmationModal = new bootstrap.Modal(document.getElementById("confirmation-modal"));
                confirmationModal.show();
                
                // Resetear botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
                
                // Limpiar formulario
                document.getElementById("payment-form").reset();
            }, 2000);
        });
        console.log("Event listener configurado para el formulario de pago");
    }
    
    // Botón para descargar PDF
    const downloadPdfBtn = document.getElementById("download-pdf");
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener("click", function() {
            alert("En un entorno de producción, aquí se generaría y descargaría un PDF con los detalles de la reserva.");
        });
    }
}

// Seleccionar fecha
function selectDate(date, spots) {
    selectedDate = date;
    console.log("Fecha seleccionada:", date, "Cupos:", spots);
    
    // Actualizar interfaz
    document.getElementById("selected-date").value = date;
    document.getElementById("available-spots").value = spots;
    
    // Validar número de tickets
    const numTickets = parseInt(document.getElementById("num-tickets").value);
    if (spots >= numTickets) {
        document.getElementById("continue-to-payment").disabled = false;
    } else {
        document.getElementById("continue-to-payment").disabled = true;
    }
    
    updateTotalPrice();
}

// Actualizar detalles del paquete seleccionado
function updatePackageDetails(packageId) {
    selectedPackage = packageId;
    const pkg = packageData[packageId];
    
    console.log("Actualizando detalles del paquete:", packageId, pkg);
    
    if (pkg) {
        // Mostrar detalles
        const selectedPackageDetails = document.getElementById("selected-package-details");
        selectedPackageDetails.classList.remove("d-none");
        
        document.getElementById("package-name").textContent = pkg.name;
        document.getElementById("package-description").textContent = pkg.description;
        document.getElementById("package-price").textContent = `$${pkg.price}`;
        
        // Actualizar duración si existe el elemento
        const durationElement = document.getElementById("package-duration");
        if (durationElement) {
            durationElement.textContent = pkg.duration;
        }
        
        document.getElementById("package-image").src = pkg.image;
        
        // Actualizar calendario con disponibilidad
        if (calendar) {
            calendar.removeAllEvents();
            const events = getAvailableEvents(packageId);
            calendar.addEventSource(events);
        }
        
        // Resetear campos de selección
        document.getElementById("selected-date").value = "";
        document.getElementById("available-spots").value = "";
        document.getElementById("continue-to-payment").disabled = true;
        
        updateTotalPrice();
    }
}

// Actualizar precio total
function updateTotalPrice() {
    const numTickets = parseInt(document.getElementById("num-tickets").value);
    const totalPriceElem = document.getElementById("total-price");
    
    if (selectedPackage && packageData[selectedPackage]) {
        const basePrice = packageData[selectedPackage].price;
        const total = basePrice * numTickets;
        totalPriceElem.value = `$${total}`;
    } else {
        totalPriceElem.value = "";
    }
}

// Obtener parámetros de URL
function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const packageParam = params.get("package");
    const dateParam = params.get("date");
    
    return { package: packageParam, date: dateParam };
}

// Función para agregar paquetes de muestra (ejecutar desde consola)
function addSamplePackages() {
    console.log("Iniciando creación de paquetes de ejemplo...");
    
    if (!window.db) {
        console.error("Firebase no está inicializado");
        alert("Error: Firebase no está inicializado");
        return;
    }
    
    // Paquetes de ejemplo con la estructura correcta
    const samplePackages = [
        {
            title: "Cancún Mágico",
            category: "playa",
            summary: "Todo incluido, Resort 5 estrellas",
            content: "Disfruta de las playas cristalinas y la cultura maya en este increíble paquete.",
            price: 800,
            duration: "7 días / 6 noches",
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
            duration: "14 días / 13 noches",
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
            duration: "6 días / 5 noches",
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
            duration: "8 días / 7 noches",
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
            duration: "7 días / 6 noches",
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
    samplePackages.forEach(packageData => {
        packagesRef.add(packageData)
            .then(docRef => {
                console.log(`Paquete "${packageData.title}" agregado con ID: ${docRef.id}`);
                addedCount++;
                
                if (addedCount + errorCount === samplePackages.length) {
                    console.log(`Proceso completado. Agregados: ${addedCount}, Errores: ${errorCount}`);
                    alert(`¡Paquetes agregados correctamente! Se agregaron ${addedCount} paquetes.`);
                    
                    // Recargar la página para ver los cambios
                    if (confirm("¿Deseas recargar la página para ver los cambios?")) {
                        window.location.reload();
                    }
                }
            })
            .catch(error => {
                console.error(`Error al agregar paquete ${packageData.title}:`, error);
                errorCount++;
                
                if (addedCount + errorCount === samplePackages.length) {
                    console.log(`Proceso completado. Agregados: ${addedCount}, Errores: ${errorCount}`);
                    alert(`Proceso completado con errores. Agregados: ${addedCount}, Errores: ${errorCount}`);
                }
            });
    });
}

// Exponer la función globalmente
window.addSamplePackages = addSamplePackages;