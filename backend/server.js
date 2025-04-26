const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Carga las variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Ruta de bienvenida
app.get('/', (req, res) => {
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

// Ruta para generar PDF
const { exec } = require('child_process');
const path = require('path');

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