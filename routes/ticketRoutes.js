const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, decodeUser } = require('../middlewares/auth');

// Endpoints de la Mesa de Tickets
router.get('/', requireAuth, ticketController.getTickets);
router.post('/', decodeUser, ticketController.createTicket);
router.put('/:id/status', requireAuth, ticketController.updateTicketStatus);

// Endpoints del catálogo de problemas asociados a Tickets
router.get('/problemas', ticketController.getProblemas); // Abierto para consultas en formularios
router.post('/problemas', requireAuth, ticketController.createProblema);
router.put('/problemas/:id', requireAuth, ticketController.updateProblema);
router.delete('/problemas/:id', requireAuth, ticketController.deleteProblema);

module.exports = router;