const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// --- API DE SESIÓN ---

// Iniciar Sesión
exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const tokenPayload = { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            nombre: user.nombre, 
            apellido: user.apellido 
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
        const redirectTo = '/dashboard';
        
        res.cookie('token', token, { httpOnly: true, secure: false, path: '/' });
        res.json({ message: 'Login exitoso', redirectTo });
    } catch (error) {
        console.error('[ERROR EN LOGIN]', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// Cerrar Sesión
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout exitoso.' });
};

// Obtener Estado de la Sesión
exports.getStatus = (req, res) => {
    res.json({ loggedIn: !!req.user, user: req.user || null });
};

// Cambiar Contraseña (Cualquier usuario autenticado)
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Todos los campos son requeridos.' });

    try {
        const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }
        
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId]);
        
        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('[ERROR CAMBIANDO CONTRASEÑA]', error);
        res.status(500).json({ message: 'Error en el servidor al cambiar la contraseña.' });
    }
};

// --- API ABM DE USUARIOS (Solo Admin) ---

// Listar todos los usuarios
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, username, nombre, apellido, role FROM users ORDER BY apellido, nombre');
        res.json(users);
    } catch (error) {
        console.error('[ERROR OBTENIENDO USUARIOS]', error);
        res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, nombre, apellido, role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ message: 'Usuario no encontrado.' });
    } catch (error) {
        console.error('[ERROR OBTENIENDO USUARIO]', error);
        res.status(500).json({ message: 'Error al obtener datos del usuario.' });
    }
};

// Crear Usuario
exports.createUser = async (req, res) => {
    const { username, password, role, nombre, apellido } = req.body;
    if (!username || !password || !role || !nombre || !apellido) return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    if (!['tecnico', 'servicios', 'editor', 'mecanica', 'admin'].includes(role)) return res.status(400).json({ message: 'Rol inválido.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password, role, nombre, apellido) VALUES (?, ?, ?, ?, ?)';
        await pool.execute(query, [username, hashedPassword, role, nombre, apellido]);
        res.status(201).json({ message: `Usuario '${username}' creado exitosamente.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        console.error('[ERROR CREANDO USUARIO]', error);
        res.status(500).json({ message: 'Error en el servidor al crear el usuario.' });
    }
};

// Editar Usuario
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, nombre, apellido, role, password } = req.body;
    if (!username || !role || !nombre || !apellido) return res.status(400).json({ message: 'Nombre, apellido, usuario y rol son requeridos.' });

    try {
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE users SET username = ?, nombre = ?, apellido = ?, role = ?, password = ? WHERE id = ?',
                [username, nombre, apellido, role, hashedPassword, id]
            );
        } else {
            await pool.execute(
                'UPDATE users SET username = ?, nombre = ?, apellido = ?, role = ? WHERE id = ?',
                [username, nombre, apellido, role, id]
            );
        }
        res.json({ message: 'Usuario actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO USUARIO]', error);
        res.status(500).json({ message: 'Error al actualizar el usuario.' });
    }
};

// Eliminar Usuario
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta.' });

    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ELIMINANDO USUARIO]', error);
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
};