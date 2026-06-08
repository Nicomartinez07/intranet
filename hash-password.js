const bcrypt = require('bcryptjs');

const password = 'password123'; // <-- Cambia esto por la contraseña que quieras generar
const saltRounds = 10;

async function generarHash() {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
    } catch (err) {
        console.error("❌ Error al generar el hash:", err);
    }
}

generarHash();