const mysql = require('mysql2/promise');

// Creamos un Pool de conexiones reutilizando las variables del .env
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'intranet_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0
});

// Exportamos el pool para usarlo en todos los controladores
module.exports = pool;