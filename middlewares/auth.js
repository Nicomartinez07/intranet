const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para requerir autenticación general
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

// Middleware para verificar un rol específico
const requireRole = (role) => (req, res, next) => {
    if (req.user && req.user.role === role) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Permisos insuficientes.' });
    }
};

// Middleware para administradores o técnicos
const requireAdminOrTecnico = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'tecnico')) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Permisos insuficientes.' });
    }
};

// Middleware blando para decodificar usuario si existe sesión
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

// Mapa de roles expuesto para los controladores de tickets
const roleToTicketTypeMap = {
    'tecnico': 'Soporte Técnico',
    'servicios': 'Servicios Generales',
    'mecanica': 'Soporte Electromecánico',
    'editor': 'Solicitud de Aula'
};

module.exports = {
    requireAuth,
    requireRole,
    requireAdminOrTecnico,
    decodeUser,
    roleToTicketTypeMap
};