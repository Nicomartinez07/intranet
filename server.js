const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

// --- Configuración Multer para RRHH ---
const storageRRHH = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.query.category;
        if (category === 'admision') destFolder = path.join(__dirname, 'public/docs/personal/form_admision');
        else if (category === 'movimiento') destFolder = path.join(__dirname, 'public/docs/personal/form_mov_personal');
        else if (category === 'descargas') destFolder = path.join(__dirname, 'public/docs/descargas');
        else if (category === 'descargas_wifi') destFolder = path.join(__dirname, 'public/docs/descargas_wifi');
        else return cb(new Error('Categoría inválida'));
        
        if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
        cb(null, destFolder);
    },
    filename: (req, file, cb) => {
        // We can keep original name or modify. Let's keep original but ensure uniqueness or just overwrite.
        cb(null, file.originalname);
    }
});
const uploadRRHH = multer({ storage: storageRRHH });

const app = express();
const PORT = process.env.PORT || 4000;

// --- Configuración ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
console.log('--- El servidor está buscando las vistas en la ruta:', path.join(__dirname, 'views'), '---');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '20_Base_2*5.', // Asegúrate de que esta sea tu contraseña correcta
    database: 'intranet_db'
};
const JWT_SECRET = 'tu_clave_secreta_super_segura';

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// === Middlewares de Autenticación ===
const requireAuth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado. Se requiere token.' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido.' });
    }
};

const requireRole = (role) => (req, res, next) => {
    if (req.user && req.user.role === role) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Permisos insuficientes.' });
    }
};

const requireAdminOrTecnico = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'tecnico')) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Permisos insuficientes.' });
    }
};

const decodeUser = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            req.user = null;
        }
    }
    next();
};

const roleToTicketTypeMap = {
    'tecnico': 'Soporte Técnico',
    'servicios': 'Servicios Generales',
    'mecanica': 'Soporte Electromecánico',
    'editor': 'Solicitud de Aula'
};

// === RUTAS DE PÁGINAS ===
app.get('/', (req, res) => res.render('index'));
app.get('/dashboard', requireAuth, (req, res) => res.render('dashboard'));
app.get('/dependencias', (req, res) => res.render('dependencias'));
app.get('/test', (req, res) => {
    res.render('test');
});

// === API DE SESIÓN ===
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        await connection.end();
        if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const tokenPayload = { id: user.id, username: user.username, role: user.role, nombre: user.nombre, apellido: user.apellido };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
        const redirectTo = '/dashboard';
        res.cookie('token', token, { httpOnly: true, secure: false, path: '/' });
        res.json({ message: 'Login exitoso', redirectTo });
    } catch (error) {
        console.error('[ERROR EN LOGIN]', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout exitoso.' });
});

app.get('/api/status', decodeUser, (req, res) => {
    res.json({ loggedIn: !!req.user, user: req.user || null });
});

app.post('/api/users/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Todos los campos son requeridos.' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            await connection.end();
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await connection.execute('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId]);
        await connection.end();
        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('[ERROR CAMBIANDO CONTRASEÑA]', error);
        res.status(500).json({ message: 'Error en el servidor al cambiar la contraseña.' });
    }
});

// === API ABM DE USUARIOS ===
app.get('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT id, username, nombre, apellido, role FROM users ORDER BY apellido, nombre');
        await connection.end();
        res.json(users);
    } catch (error) {
        console.error('[ERROR OBTENIENDO USUARIOS]', error);
        res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
});

app.get('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, username, nombre, apellido, role FROM users WHERE id = ?', [req.params.id]);
        await connection.end();
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ message: 'Usuario no encontrado.' });
    } catch (error) {
        console.error('[ERROR OBTENIENDO USUARIO]', error);
        res.status(500).json({ message: 'Error al obtener datos del usuario.' });
    }
});

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
    const { username, password, role, nombre, apellido } = req.body;
    if (!username || !password || !role || !nombre || !apellido) return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    if (!['tecnico', 'servicios', 'editor', 'mecanica', 'admin'].includes(role)) return res.status(400).json({ message: 'Rol inválido.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO users (username, password, role, nombre, apellido) VALUES (?, ?, ?, ?, ?)';
        await connection.execute(query, [username, hashedPassword, role, nombre, apellido]);
        await connection.end();
        res.status(201).json({ message: `Usuario '${username}' creado exitosamente.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        console.error('[ERROR CREANDO USUARIO]', error);
        res.status(500).json({ message: 'Error en el servidor al crear el usuario.' });
    }
});

app.put('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { username, nombre, apellido, role, password } = req.body;
    if (!username || !role || !nombre || !apellido) return res.status(400).json({ message: 'Nombre, apellido, usuario y rol son requeridos.' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await connection.execute(
                'UPDATE users SET username = ?, nombre = ?, apellido = ?, role = ?, password = ? WHERE id = ?',
                [username, nombre, apellido, role, hashedPassword, id]
            );
        } else {
            await connection.execute(
                'UPDATE users SET username = ?, nombre = ?, apellido = ?, role = ? WHERE id = ?',
                [username, nombre, apellido, role, id]
            );
        }
        await connection.end();
        res.json({ message: 'Usuario actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO USUARIO]', error);
        res.status(500).json({ message: 'Error al actualizar el usuario.' });
    }
});

app.delete('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta.' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        await connection.end();
        res.json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ELIMINANDO USUARIO]', error);
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
});


// === API DE TICKETS ===
app.get('/api/tickets', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT t.id, t.ticket_type, t.problema, t.status, t.created_at, 
                   CONCAT(t.apellido, ', ', t.nombre) as solicitante_nombre, 
                   d.nombre as dependencia_nombre, 
                   COALESCE(u.username, 'Anónimo') as registrado_por 
            FROM tickets t 
            LEFT JOIN users u ON t.user_id = u.id 
            LEFT JOIN dependencias d ON t.dependencia_id = d.id 
            ORDER BY t.created_at DESC`;
        const [tickets] = await connection.execute(query);
        await connection.end();
        res.json(tickets);
    } catch (error) {
        console.error('[ERROR OBTENIENDO TICKETS]', error);
        res.status(500).json({ message: 'Error al obtener los tickets.' });
    }
});

app.post('/api/tickets', decodeUser, async (req, res) => {
    const { ticket_type, apellido, nombre, dependencia_id, problema, description } = req.body;
    if (!ticket_type || !apellido || !nombre || !description) return res.status(400).json({ message: 'Apellido, Nombre, Tipo y Descripción son requeridos.' });

    const initialStatus = ticket_type === 'Solicitud de Aula' ? 'Solicitada' : 'Abierto';
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `INSERT INTO tickets (user_id, ticket_type, apellido, nombre, dependencia_id, problema, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.execute(query, [req.user ? req.user.id : null, ticket_type, apellido, nombre, dependencia_id || null, problema, description, initialStatus]);
        await connection.end();
        res.status(201).json({ message: 'Ticket creado exitosamente.' });
    } catch (error) {
        console.error('[ERROR CREANDO TICKET]', error);
        res.status(500).json({ message: 'Error al crear el ticket.' });
    }
});

app.put('/api/tickets/:id/status', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ['Abierto', 'En Proceso', 'Cerrado', 'Solicitada', 'Aprobada', 'Rechazada'];
    if (!status || !allowedStatus.includes(status)) return res.status(400).json({ message: 'Estado inválido.' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
        await connection.end();
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ticket no encontrado.' });
        res.json({ message: `El estado del ticket #${id} ha sido actualizado a "${status}".` });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO ESTADO]', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el estado.' });
    }
});

// === API ABM DE PROBLEMAS ===
app.get('/api/problemas', async (req, res) => {
    const { ticket_type } = req.query;
    if (!ticket_type) return res.status(400).json({ message: 'El tipo de ticket es requerido.' });
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM problemas WHERE ticket_type = ? ORDER BY problema_nombre ASC', [ticket_type]);
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO PROBLEMAS]', error);
        res.status(500).json({ message: 'Error al obtener los problemas.' });
    }
});

app.post('/api/problemas', requireAuth, async (req, res) => {
    const { ticket_type, problema_nombre } = req.body;
    const userRole = req.user.role;
    if (userRole !== 'admin' && roleToTicketTypeMap[userRole] !== ticket_type) return res.status(403).json({ message: 'Permiso denegado.' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO problemas (ticket_type, problema_nombre) VALUES (?, ?)';
        await connection.execute(query, [ticket_type, problema_nombre]);
        await connection.end();
        res.status(201).json({ message: 'Problema creado exitosamente.' });
    } catch (error) {
        console.error('[ERROR CREANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al crear el problema.' });
    }
});

app.put('/api/problemas/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { problema_nombre } = req.body;
    const userRole = req.user.role;
    try {
        const connection = await mysql.createConnection(dbConfig);
        if (userRole !== 'admin') {
            const [problemRows] = await connection.execute('SELECT ticket_type FROM problemas WHERE id = ?', [id]);
            if (problemRows.length === 0) {
                await connection.end();
                return res.status(404).json({ message: 'Problema no encontrado.' });
            }
            if (roleToTicketTypeMap[userRole] !== problemRows[0].ticket_type) {
                await connection.end();
                return res.status(403).json({ message: 'Permiso denegado.' });
            }
        }
        await connection.execute('UPDATE problemas SET problema_nombre = ? WHERE id = ?', [problema_nombre, id]);
        await connection.end();
        res.json({ message: 'Problema actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al actualizar el problema.' });
    }
});

app.delete('/api/problemas/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userRole = req.user.role;
    try {
        const connection = await mysql.createConnection(dbConfig);
        if (userRole !== 'admin') {
            const [problemRows] = await connection.execute('SELECT ticket_type FROM problemas WHERE id = ?', [id]);
            if (problemRows.length === 0) {
                await connection.end();
                return res.status(404).json({ message: 'Problema no encontrado.' });
            }
            if (roleToTicketTypeMap[userRole] !== problemRows[0].ticket_type) {
                await connection.end();
                return res.status(403).json({ message: 'Permiso denegado.' });
            }
        }
        await connection.execute('DELETE FROM problemas WHERE id = ?', [id]);
        await connection.end();
        res.json({ message: 'Problema eliminado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ELIMINANDO PROBLEMA]', error);
        res.status(500).json({ message: 'Error al eliminar el problema.' });
    }
});

// === OTRAS APIS ===
app.get('/api/directorio', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT d.id AS dependencia_id, d.dep_nombre, d.dep_responsable,
                   o.id AS oficina_id, o.ofi_oficina AS oficina_nombre, o.ofi_ubicacion AS piso, o.ofi_nronuevo AS interno, o.ofi_usuario AS oficina_responsable
            FROM dependencias d
            LEFT JOIN oficinas o ON d.id = o.id_dependencia
            ORDER BY d.dep_nombre ASC, o.ofi_oficina ASC
        `;
        const [rows] = await connection.execute(query);
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO DIRECTORIO]', error);
        res.status(500).json({ message: 'Error al obtener los datos del directorio.' });
    }
});

app.put('/api/dependencias/:id', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    const { dep_nombre, dep_responsable } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE dependencias SET dep_nombre = ?, dep_responsable = ? WHERE id = ?', [dep_nombre || '', dep_responsable || '', req.params.id]);
        await connection.end();
        res.json({ message: 'Dependencia actualizada con éxito.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO DEPENDENCIA]', error);
        res.status(500).json({ message: 'Error al actualizar la dependencia.' });
    }
});

app.put('/api/oficinas/:id', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    const { ofi_oficina, ofi_nronuevo, ofi_ubicacion, ofi_usuario } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE oficinas SET ofi_oficina = ?, ofi_nronuevo = ?, ofi_ubicacion = ?, ofi_usuario = ? WHERE id = ?',
            [ofi_oficina || '', ofi_nronuevo || '', ofi_ubicacion || '', ofi_usuario || '', req.params.id]
        );
        await connection.end();
        res.json({ message: 'Oficina actualizada con éxito.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO OFICINA]', error);
        res.status(500).json({ message: 'Error al actualizar la oficina.' });
    }
});

app.post('/api/dependencias', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    const { dep_nombre } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO dependencias (dep_nombre, dep_responsable) VALUES (?, ?)', [dep_nombre, '']);
        await connection.end();
        res.json({ message: 'Dependencia creada.', id: result.insertId });
    } catch (error) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/dependencias/:id', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM oficinas WHERE id_dependencia = ?', [req.params.id]);
        await connection.execute('DELETE FROM dependencias WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Dependencia eliminada.' });
    } catch (error) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/oficinas', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    const { id_dependencia, ofi_oficina, ofi_ubicacion, ofi_nronuevo } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO oficinas (id_dependencia, ofi_oficina, ofi_ubicacion, ofi_nronuevo, ofi_usuario, ofi_visible) VALUES (?, ?, ?, ?, ?, 1)', [id_dependencia, ofi_oficina || '', ofi_ubicacion || '', ofi_nronuevo || '', '']);
        await connection.end();
        res.json({ message: 'Oficina creada.', id: result.insertId });
    } catch (error) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/oficinas/:id', requireAuth, async (req, res) => {
    if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ message: 'Permiso denegado.' });
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM oficinas WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Oficina eliminada.' });
    } catch (error) { res.status(500).json({ message: 'Error' }); }
});

app.get('/api/dependencias', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, dep_nombre AS nombre FROM dependencias ORDER BY dep_nombre ASC');
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO DEPENDENCIAS]', error);
        res.status(500).json({ message: 'Error al obtener las dependencias.' });
    }
});

app.get('/api/finanzas/tarjetas', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT *, DATE_FORMAT(ultima_actualizacion, "%M/%Y") as mes_actualizacion FROM interes_tarjetas ORDER BY cuotas ASC');
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO FINANCIAMIENTO]', error);
        res.status(500).json({ message: 'Error al obtener los datos de financiamiento.' });
    }
});

app.put('/api/finanzas/tarjetas/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { coeficiente } = req.body;
    if (coeficiente === undefined || isNaN(parseFloat(coeficiente))) return res.status(400).json({ message: 'Coeficiente inválido.' });
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('UPDATE interes_tarjetas SET coeficiente = ? WHERE id = ?', [coeficiente, id]);
        await connection.end();
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado.' });
        res.json({ message: 'Coeficiente actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO COEFICIENTE]', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar.' });
    }
});

// === API RRHH (DOCUMENTOS) ===
app.get('/api/rrhh/files', (req, res) => {
    const { category } = req.query;
    let folderPath = '';
    let webPath = '';
    if (category === 'admision') {
        folderPath = path.join(__dirname, 'public/docs/personal/form_admision');
        webPath = 'docs/personal/form_admision';
    } else if (category === 'movimiento') {
        folderPath = path.join(__dirname, 'public/docs/personal/form_mov_personal');
        webPath = 'docs/personal/form_mov_personal';
    } else if (category === 'descargas') {
        folderPath = path.join(__dirname, 'public/docs/descargas');
        webPath = 'docs/descargas';
    } else if (category === 'descargas_wifi') {
        folderPath = path.join(__dirname, 'public/docs/descargas_wifi');
        webPath = 'docs/descargas_wifi';
    } else {
        return res.status(400).json({ message: 'Categoría inválida.' });
    }

    if (!fs.existsSync(folderPath)) {
        return res.json([]);
    }

    fs.readdir(folderPath, (err, files) => {
        if (err) return res.status(500).json({ message: 'Error al leer la carpeta.' });
        // Filter out hidden files
        const pdfFiles = files.filter(f => !f.startsWith('.') && (f.endsWith('.pdf') || f.endsWith('.doc') || f.endsWith('.docx'))).map(f => ({
            name: f,
            url: `/${webPath}/${f}`
        }));
        res.json(pdfFiles);
    });
});

app.post('/api/rrhh/upload', requireAuth, requireAdminOrTecnico, uploadRRHH.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo.' });
    res.json({ message: 'Archivo subido correctamente.', file: req.file.originalname });
});

app.delete('/api/rrhh/files/:filename', requireAuth, requireAdminOrTecnico, (req, res) => {
    const { category } = req.query;
    const { filename } = req.params;
    let folderPath = '';
    if (category === 'admision') folderPath = path.join(__dirname, 'public/docs/personal/form_admision');
    else if (category === 'movimiento') folderPath = path.join(__dirname, 'public/docs/personal/form_mov_personal');
    else if (category === 'descargas') folderPath = path.join(__dirname, 'public/docs/descargas');
    else if (category === 'descargas_wifi') folderPath = path.join(__dirname, 'public/docs/descargas_wifi');
    else return res.status(400).json({ message: 'Categoría inválida.' });

    const filePath = path.join(folderPath, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Archivo no encontrado.' });

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el archivo.' });
        res.json({ message: 'Archivo eliminado correctamente.' });
    });
});

// === INICIO DEL SERVIDOR ===
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});