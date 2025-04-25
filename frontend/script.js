import { auth, db } from '../backend/firebaseConfig.js';

// Authentication State Listener
auth.onAuthStateChanged(user => {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');

    if (user) {
        authButtons.classList.add('d-none');
        userInfo.classList.remove('d-none');
        userName.textContent = user.email;
    } else {
        authButtons.classList.remove('d-none');
        userInfo.classList.add('d-none');
    }
});

// Login Form
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("Inicio de sesión exitoso!");
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        })
        .catch(error => {
            alert("Error al iniciar sesión: " + error.message);
        });
});

// Signup Form
document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('userRole').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            return db.collection("users").doc(user.uid).set({
                email: user.email,
                role: role
            });
        })
        .then(() => {
            alert("Registro exitoso!");
            bootstrap.Modal.getInstance(document.getElementById('signupModal')).hide();
        })
        .catch(error => {
            alert("Error al registrarse: " + error.message);
        });
});

// Logout Function
document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            alert("Sesión cerrada!");
        })
        .catch(error => {
            alert("Error al cerrar sesión: " + error.message);
        });
});

// Newsletter Subscription
function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletter-email');
    const email = emailInput?.value;
    if (email) {
        db.collection("newsletters").add({
            email: email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            alert("¡Suscripción exitosa!");
            emailInput.value = '';
        })
        .catch(error => {
            alert("Error al suscribirse: " + error.message);
        });
    } else {
        alert("Por favor, ingresa un correo electrónico.");
    }
}

// Search Packages Function
function searchPackages() {
    const destination = document.getElementById('destination')?.value;
    const date = document.getElementById('date')?.value;
    const duration = document.getElementById('duration')?.value;
    const travelers = document.getElementById('travelers')?.value;

    const queryParams = new URLSearchParams({
        destination: destination || '',
        date: date || '',
        duration: duration || '',
        travelers: travelers || ''
    });
    window.location.href = `packages.html?${queryParams.toString()}`;
}

// Load Packages Function
function loadPackages() {
    const container = document.getElementById('packages-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const searchDestination = urlParams.get('destination');

    fetch('http://localhost:5000/api/packages')
        .then(response => response.json())
        .then(packages => {
            container.innerHTML = '';
            const filteredPackages = searchDestination && searchDestination !== "Cualquier destino"
                ? packages.filter(pkg => pkg.destination === searchDestination)
                : packages;

            filteredPackages.forEach(pkg => {
                const card = `
                    <div class="col-md-4">
                        <div class="package-card">
                            <div class="package-image">
                                <img src="${pkg.image}" alt="${pkg.destination}">
                            </div>
                            <div class="package-details">
                                <h3 class="package-title">${pkg.destination}</h3>
                                <div class="package-price">Desde $${pkg.price}</div>
                                <ul class="package-features">
                                    ${pkg.features.map(feature => `<li><i class="fas fa-check"></i>${feature}</li>`).join('')}
                                </ul>
                                <a href="booking.html?packageId=${pkg.id}" class="btn btn-custom w-100">Reservar ahora</a>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += card;
            });
        })
        .catch(error => {
            console.error("Error al cargar paquetes:", error);
        });
}

// Initialize Calendar for Booking
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const packageDetailsEl = document.getElementById('package-details');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    if (!calendarEl || !packageDetailsEl || !confirmPaymentBtn) return;

    const urlParams = new URLSearchParams(window.location.search);
    const packageId = urlParams.get('packageId');

    if (!packageId) {
        packageDetailsEl.innerHTML = '<p class="text-danger">No se seleccionó un paquete.</p>';
        return;
    }

    let packageData;
    fetch('http://192.168.0.209:5000/api/packages')
        .then(response => response.json())
        .then(packages => {
            packageData = packages.find(pkg => pkg.id === packageId);
            if (packageData) {
                packageDetailsEl.innerHTML = `
                    <h3>Reservando: ${packageData.destination}</h3>
                    <p>Precio: $${packageData.price}</p>
                    <p>Duración: ${packageData.duration}</p>
                `;
            } else {
                packageDetailsEl.innerHTML = '<p class="text-danger">Paquete no encontrado.</p>';
            }
        })
        .catch(error => {
            console.error("Error al cargar paquete:", error);
        });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        select: function(info) {
            const user = auth.currentUser;
            if (user) {
                db.collection("bookings").add({
                    userId: user.uid,
                    packageId: packageId,
                    startDate: info.startStr,
                    endDate: info.endStr,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    alert("Reserva creada con éxito!");
                    confirmPaymentBtn.style.display = 'block';
                }).catch(error => {
                    alert("Error al crear reserva: " + error.message);
                });
            } else {
                alert("Por favor, inicia sesión para reservar.");
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            }
        }
    });
    calendar.render();

    confirmPaymentBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (!user || !packageData) return;

        const paymentData = {
            userId: user.uid,
            packageId: packageId,
            packageName: packageData.destination,
            price: packageData.price,
            email: user.email,
            duration: packageData.duration
        };

        fetch('http://192.168.0.209:5000/api/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comprobante_${packageId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);

            db.collection("payments").add({
                userId: user.uid,
                packageId: packageId,
                amount: packageData.price,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("Pago confirmado y comprobante generado!");
            });
        })
        .catch(error => {
            console.error("Error al generar comprobante:", error);
            alert("Error al confirmar el pago.");
        });
    });
}

// Chat Button Function
document.getElementById('chat-btn')?.addEventListener('click', () => {
    alert('¡Chat en vivo disponible pronto! Contáctanos por teléfono o email.');
});

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('bg-white', 'shadow');
    } else {
        navbar.classList.remove('bg-white', 'shadow');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPackages();
    initCalendar();
});