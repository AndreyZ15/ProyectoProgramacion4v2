const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');

// Carga las variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de rutas estáticas
app.use('/static', express.static(path.join(__dirname, 'frontend/static')));

// Inicializa Firebase Admin
const serviceAccount = require('../proyectoproga4AccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Configura Nodemailer para enviar correos
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Rutas para servir archivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/index.html'));
});

app.get('/packages', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/packages.html'));
});

app.get('/destinations', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/destinations.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/about.html'));
});

app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/news.html'));
});

// Nueva ruta para la página de reservas
app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/templates/booking.html'));
});

// Ruta de bienvenida para la API
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to TravelExperts API',
        version: '1.0.0',
        status: 'online'
    });
});

// Ruta para agregar un paquete
app.post('/api/add-package', async (req, res) => {
    try {
        const { destination, price, duration, features, image } = req.body;
        if (!destination || !price || !duration || !features || !image) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const packageData = {
            destination,
            price: Number(price),
            duration,
            features,
            image,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            availability: 10
        };

        const packageRef = await db.collection('packages').add(packageData);

        // Notificar a usuarios VIP
        const vipUsersSnapshot = await db.collection('users').where('role', '==', 'client_vip').get();
        const vipEmails = vipUsersSnapshot.docs.map(doc => doc.data().email);

        if (vipEmails.length > 0) {
            const mailOptions = {
                from: process.env.EMAIL_SENDER,
                to: vipEmails,
                subject: `New Package Available: ${destination}`,
                text: `A new package to ${destination} has been added! Price: $${price}, Duration: ${duration}. Check it out now!`
            };
            await transporter.sendMail(mailOptions);
        }

        res.status(201).json({ message: 'Package added successfully', id: packageRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para listar paquetes
app.get('/api/packages', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let discount = 1;
        if (authHeader) {
            const user = await admin.auth().verifyIdToken(authHeader.split(' ')[1]);
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === 'client_vip') {
                discount = 0.9;
            }
        }

        const snapshot = await db.collection('packages').get();
        const packages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: data.price * discount
            };
        });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rutas para el sistema de reservas
app.get('/api/availability/:packageId', async (req, res) => {
    try {
        const { packageId } = req.params;
        const { date } = req.query;
        
        // Simulación - En un entorno real, esto vendría de la base de datos
        const availabilityData = {
            'cancun': {
                '2025-04-28': 15,
                '2025-04-29': 10,
                '2025-04-30': 20,
                '2025-05-01': 5,
                '2025-05-02': 8,
                '2025-05-03': 12,
                '2025-05-04': 15,
                '2025-05-10': 10,
                '2025-05-17': 8,
                '2025-05-24': 9
            },
            'europa': {
                '2025-04-28': 8,
                '2025-04-29': 6,
                '2025-04-30': 10,
                '2025-05-01': 3,
                '2025-05-02': 5,
                '2025-05-03': 7,
                '2025-05-04': 8,
                '2025-05-15': 6,
                '2025-05-22': 4
            },
            'asia': {
                '2025-04-28': 4,
                '2025-04-29': 3,
                '2025-04-30': 5,
                '2025-05-01': 2,
                '2025-05-02': 3,
                '2025-05-03': 4,
                '2025-05-04': 4,
                '2025-05-12': 5,
                '2025-05-19': 3
            }
        };
        
        if (date) {
            res.json({ date, availability: availabilityData[packageId]?.[date] || 0 });
        } else {
            res.json(availabilityData[packageId] || {});
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para crear una reserva
app.post('/api/reservations', async (req, res) => {
    try {
        const { userId, packageId, date, tickets, totalPrice } = req.body;
        
        // Generar número de confirmación
        const confirmationNumber = 'CONF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // En un escenario real, aquí actualizaríamos la base de datos
        
        res.status(201).json({ 
            success: true, 
            confirmationNumber,
            message: 'Reserva creada exitosamente'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para generar PDF
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { packageName, price, duration, startDate, endDate, email } = req.body;
        const data = { packageName, price, duration, startDate, endDate };
        const pdfPath = path.join(__dirname, `reservation_${Date.now()}.pdf`);

        // Llama al script Python para generar el PDF
        exec(`python generate_pdf.py '${JSON.stringify(data)}' '${pdfPath}'`, async (error) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Enviar el PDF por correo
            const mailOptions = {
                from: process.env.EMAIL_SENDER,
                to: email,
                subject: 'Your TravelExperts Reservation',
                text: 'Thank you for your reservation! Please find your confirmation attached.',
                attachments: [{ path: pdfPath }]
            };
            await transporter.sendMail(mailOptions);

            res.download(pdfPath);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para procesar pagos (simulado)
app.post('/api/payment', (req, res) => {
    try {
        const { cardNumber, cardHolder, amount } = req.body;
        
        // Validación básica
        if (!cardNumber || !cardHolder || !amount) {
            return res.status(400).json({ success: false, error: 'Faltan datos para procesar el pago' });
        }
        
        // Simular procesamiento (en producción se conectaría a una pasarela de pagos)
        setTimeout(() => {
            // 95% de éxito en los pagos simulados
            const success = Math.random() < 0.95;
            
            if (success) {
                res.json({
                    success: true,
                    transactionId: 'TX' + Date.now(),
                    message: 'Pago procesado correctamente'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Error al procesar el pago',
                    message: 'La tarjeta fue rechazada. Por favor intente con otra tarjeta.'
                });
            }
        }, 1500); // Simular retraso de procesamiento
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Ruta para agregar noticias
app.post('/api/news', async (req, res) => {
    try {
        const { title, content } = req.body;
        const newsData = {
            title,
            content,
            date: admin.firestore.FieldValue.serverTimestamp()
        };
        const newsRef = await db.collection('news').add(newsData);

        const vipUsersSnapshot = await db.collection('users').where('role', '==', 'client_vip').get();
        const vipEmails = vipUsersSnapshot.docs.map(doc => doc.data().email);

        if (vipEmails.length > 0) {
            const mailOptions = {
                from: process.env.EMAIL_SENDER,
                to: vipEmails,
                subject: `New Travel News: ${title}`,
                text: `A new article has been published: ${title}. Check it out now!`
            };
            await transporter.sendMail(mailOptions);
        }

        res.status(201).json({ message: 'News added successfully', id: newsRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para listar noticias
app.get('/api/news', async (req, res) => {
    try {
        const snapshot = await db.collection('news').get();
        const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para agregar comentarios
app.post('/api/comments', async (req, res) => {
    try {
        const { userId, packageId, comment, rating } = req.body;
        const commentData = {
            userId,
            packageId,
            comment,
            rating: Number(rating),
            date: admin.firestore.FieldValue.serverTimestamp()
        };
        const commentRef = await db.collection('comments').add(commentData);
        res.status(201).json({ message: 'Comment added successfully', id: commentRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para listar comentarios
app.get('/api/comments/:packageId', async (req, res) => {
    try {
        const packageId = req.params.packageId;
        const snapshot = await db.collection('comments').where('packageId', '==', packageId).get();
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inicia el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});