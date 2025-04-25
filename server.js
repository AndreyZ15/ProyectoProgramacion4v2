const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const port = 8080; // Puerto para el frontend

// Configurar la carpeta estática para los archivos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Ruta para servir index.html como página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Iniciar el servidor Flask como un subproceso
const flaskProcess = spawn('python', ['-m', 'backend.app'], {
    cwd: __dirname,
    env: { ...process.env, PYTHONPATH: __dirname }
});

flaskProcess.stdout.on('data', (data) => {
    console.log(`Flask: ${data}`);
});

flaskProcess.stderr.on('data', (data) => {
    console.error(`Flask Error: ${data}`);
});

flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
});

// Iniciar el servidor Node.js
app.listen(port, () => {
    console.log(`Servidor frontend ejecutándose en http://localhost:${port}`);
});