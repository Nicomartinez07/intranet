const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireRole, decodeUser } = require('../middlewares/auth');

// Rutas públicas y de sesión general
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/status', decodeUser, authController.getStatus);
router.post('/users/change-password', requireAuth, authController.changePassword);

// Rutas protegidas exclusivamente para Administradores (ABM)
router.get('/users', requireAuth, requireRole('admin'), authController.getUsers);
router.get('/users/:id', requireAuth, requireRole('admin'), authController.getUserById);
router.post('/users', requireAuth, requireRole('admin'), authController.createUser);
router.put('/users/:id', requireAuth, requireRole('admin'), authController.updateUser);
router.delete('/users/:id', requireAuth, requireRole('admin'), authController.deleteUser);

module.exports = router;