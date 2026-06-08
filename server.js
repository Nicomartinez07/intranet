require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Importar Enrutadores Modularizados
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const directoryRoutes = require('./routes/directoryRoutes');
const rrhhRoutes = require('./routes/rrhhRoutes');

// Importar Middlewares de Vistas
const { requireAuth } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Configuración del Motor de Plantillas ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
console.log(`🚀 Sistema cargando vistas desde: ${path.join(__dirname, 'views')}`);

// --- Middlewares Globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Montar Rutas de la API REST ---
app.use('/api', authRoutes);         // Maneja login, logout, estatus, ABM users
app.use('/api/tickets', ticketRoutes); // Maneja tickets y problemas tipificados
app.use('/api', directoryRoutes);    // Maneja directorio, dependencias, oficinas y finanzas
app.use('/api/rrhh', rrhhRoutes);     // Maneja subida/baja de archivos locales

// --- Enrutamiento de Páginas EJS ---
app.get('/', (req, res) => res.render('index'));
app.get('/dashboard', requireAuth, (req, res) => res.render('dashboard'));
app.get('/dependencias', (req, res) => res.render('dependencias'));
app.get('/test', (req, res) => res.render('test'));

// --- Manejo global de errores en Multer/Rutas (Opcional) ---
app.use((err, req, res, next) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
});

// --- Inicialización del Servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor de la Intranet corriendo en: http://localhost:${PORT}`);
});