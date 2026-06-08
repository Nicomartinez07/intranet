const pool = require('../config/db');
const { roleToTicketTypeMap } = require('../middlewares/auth');

// --- API DE TICKETS ---

// Obtener todos los tickets (con JOIN a usuarios y dependencias)
exports.getTickets = async (req, res) => {
    try {
        const query = `
            SELECT t.id, t.ticket_type, t.problema, t.status, t.created_at, 
                   CONCAT(t.apellido, ', ', t.nombre) as solicitante_nombre, 
                   d.nombre as dependencia_nombre, 
                   COALESCE(u.username, 'Anónimo') as registrado_por 
            FROM tickets t 
            LEFT JOIN users u ON t.user_id = u.id 
            LEFT JOIN dependencias d ON t.dependencia_id = d.id 
            ORDER BY t.created_at DESC`;
            
        const [tickets] = await pool.execute(query);
        res.json(tickets);
    } catch (error) {
        console.error('[ERROR OBTENIENDO TICKETS]', error);
        res.status(500).json({ message: 'Error al obtener los tickets.' });
    }
};

// Crear un nuevo Ticket (Soporta envío anónimo si no hay sesión activa)
exports.createTicket = async (req, res) => {
    const { ticket_type, apellido, nombre, dependencia_id, problema, description } = req.body;
    if (!ticket_type || !apellido || !nombre || !description) {
        return res.status(400).json({ message: 'Apellido, Nombre, Tipo y Descripción son requeridos.' });
    }

    const initialStatus = ticket_type === 'Solicitud de Aula' ? 'Solicitada' : 'Abierto';
    try {
        const query = `INSERT INTO tickets (user_id, ticket_type, apellido, nombre, dependencia_id, problema, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(query, [
            req.user ? req.user.id : null, 
            ticket_type, 
            apellido, 
            nombre, 
            dependencia_id || null, 
            problema, 
            description, 
            initialStatus
        ]);
        res.status(201).json({ message: 'Ticket creado exitosamente.' });
    } catch (error) {
        console.error('[ERROR CREANDO TICKET]', error);
        res.status(500).json({ message: 'Error al crear el ticket.' });
    }
};

// Actualizar el estado de un ticket
exports.updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ['Abierto', 'En Proceso', 'Cerrado', 'Solicitada', 'Aprobada', 'Rechazada'];
    if (!status || !allowedStatus.includes(status)) return res.status(400).json({ message: 'Estado inválido.' });

    try {
        const [result] = await pool.execute('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ticket no encontrado.' });
        res.json({ message: `El estado del ticket #${id} ha sido actualizado a "${status}".` });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO ESTADO]', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el estado.' });
    }
};


// --- API ABM DE PROBLEMAS (Tipificaciones por Rol) ---

// Listar problemas filtrados por tipo de ticket
exports.getProblemas = async (req, res) => {
    const { ticket_type } = req.query;
    if (!ticket_type) return res.status(400).json({ message: 'El tipo de ticket es requerido.' });
    try {
        const [rows] = await pool.execute('SELECT * FROM problemas WHERE ticket_type = ? ORDER BY problema_nombre ASC', [ticket_type]);
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO PROBLEMAS]', error);
        res.status(500).json({ message: 'Error al obtener los problemas.' });
    }
};

// Crear una categoría de problema (Valida permisos según mapa de roles)
exports.createProblema = async (req, res) => {
    const { ticket_type, problema_nombre } = req.body;
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && roleToTicketTypeMap[userRole] !== ticket_type) {
        return res.status(403).json({ message: 'Permiso denegado.' });
    }

    try {
        const query = 'INSERT INTO problemas (ticket_type, problema_nombre) VALUES (?, ?)';
        await pool.execute(query, [ticket_type, problema_nombre]);
        res.status(201).json({ message: 'Problema creado exitosamente.' });
    } catch (error) {
        console.error('[ERROR CREANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al crear el problema.' });
    }
};

// Modificar una categoría de problema
exports.updateProblema = async (req, res) => {
    const { id } = req.params;
    const { problema_nombre } = req.body;
    const userRole = req.user.role;
    try {
        if (userRole !== 'admin') {
            const [problemRows] = await pool.execute('SELECT ticket_type FROM problemas WHERE id = ?', [id]);
            if (problemRows.length === 0) return res.status(404).json({ message: 'Problema no encontrado.' });
            
            if (roleToTicketTypeMap[userRole] !== problemRows[0].ticket_type) {
                return res.status(403).json({ message: 'Permiso denegado.' });
            }
        }
        await pool.execute('UPDATE problemas SET problema_nombre = ? WHERE id = ?', [problema_nombre, id]);
        res.json({ message: 'Problema actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al actualizar el problema.' });
    }
};

// Eliminar un problema tipificado
exports.deleteProblema = async (req, res) => {
    const { id } = req.params;
    const userRole = req.user.role;
    try {
        if (userRole !== 'admin') {
            const [problemRows] = await pool.execute('SELECT ticket_type FROM problemas WHERE id = ?', [id]);
            if (problemRows.length === 0) return res.status(404).json({ message: 'Problema no encontrado.' });
            
            if (roleToTicketTypeMap[userRole] !== problemRows[0].ticket_type) {
                return res.status(403).json({ message: 'Permiso denegado.' });
            }
        }
        await pool.execute('DELETE FROM problemas WHERE id = ?', [id]);
        res.json({ message: 'Problema eliminado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ELIMINANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al eliminar el problema.' });
    }
};