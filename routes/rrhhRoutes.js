const express = require('express');
const router = express.Router();
const rrhhController = require('../controllers/rrhhController');
const { requireAuth, requireAdminOrTecnico } = require('../middlewares/auth');

// Rutas de administración de archivos de RRHH y Soporte
router.get('/files', rrhhController.getFiles); 
router.post('/upload', requireAuth, requireAdminOrTecnico, rrhhController.upload.single('file'), rrhhController.uploadSuccess);
router.delete('/files/:filename', requireAuth, requireAdminOrTecnico, rrhhController.deleteFile);

module.exports = router;