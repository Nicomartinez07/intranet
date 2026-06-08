const express = require('express');
const router = express.Router();
const directoryController = require('../controllers/directoryController');
const { requireAuth, requireRole, requireAdminOrTecnico } = require('../middlewares/auth');

// --- Rutas del Directorio e Internos (Públicas para consulta) ---
router.get('/directorio', directoryController.getDirectorio);
router.get('/dependencias', directoryController.getDependenciasLista);

// --- Rutas de ABM Dependencias (Protegidas para Admin o Técnico) ---
router.post('/dependencias', requireAuth, requireAdminOrTecnico, directoryController.createDependencia);
router.put('/dependencias/:id', requireAuth, requireAdminOrTecnico, directoryController.updateDependencia);
router.delete('/dependencias/:id', requireAuth, requireAdminOrTecnico, directoryController.deleteDependencia);

// --- Rutas de ABM Oficinas (Protegidas para Admin o Técnico) ---
router.post('/oficinas', requireAuth, requireAdminOrTecnico, directoryController.createOficina);
router.put('/oficinas/:id', requireAuth, requireAdminOrTecnico, directoryController.updateOficina);
router.delete('/oficinas/:id', requireAuth, requireAdminOrTecnico, directoryController.deleteOficina);

// --- Rutas Financieras (Tarjetas) ---
router.get('/finanzas/tarjetas', directoryController.getTarjetas); // Consulta libre
router.put('/finanzas/tarjetas/:id', requireAuth, requireRole('admin'), directoryController.updateCoeficiente); // Solo Admin cambia tasas

module.exports = router;