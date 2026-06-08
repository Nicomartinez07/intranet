const bcrypt = require('bcryptjs');

const password = 'password123'; // <-- CAMBIA ESTO por la contraseña que desees
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error al generar el hash:", err);
        return;
    }
    console.log("Tu contraseña simple es:", password);
    console.log("\nCopia y pega este hash en tu base de datos:");
    console.log(hash);
});