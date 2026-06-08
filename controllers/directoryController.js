const pool = require('../config/db');

// ==========================================
// --- API DEL DIRECTORIO (TELÉFONOS / OFICINAS) ---
// ==========================================

// Obtener el árbol completo del directorio (Dependencias + Oficinas)
exports.getDirectorio = async (req, res) => {
    try {
        const query = `
            SELECT d.id AS dependencia_id, d.dep_nombre, d.dep_responsable,
                   o.id AS oficina_id, o.ofi_oficina AS oficina_nombre, o.ofi_ubicacion AS piso, 
                   o.ofi_nronuevo AS interno, o.ofi_usuario AS oficina_responsable
            FROM dependencias d
            LEFT JOIN oficinas o ON d.id = o.id_dependencia
            ORDER BY d.dep_nombre ASC, o.ofi_oficina ASC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO DIRECTORIO]', error);
        res.status(500).json({ message: 'Error al obtener los datos del directorio.' });
    }
};

// Obtener solo las dependencias (Lista plana simplificada)
exports.getDependenciasLista = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, dep_nombre AS nombre FROM dependencias ORDER BY dep_nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO DEPENDENCIAS]', error);
        res.status(500).json({ message: 'Error al obtener las dependencias.' });
    }
};

// Crear una Dependencia nueva
exports.createDependencia = async (req, res) => {
    const { dep_nombre } = req.body;
    try {
        const [result] = await pool.execute('INSERT INTO dependencias (dep_nombre, dep_responsable) VALUES (?, ?)', [dep_nombre, '']);
        res.json({ message: 'Dependencia creada con éxito.', id: result.insertId });
    } catch (error) { 
        console.error('[ERROR CREANDO DEPENDENCIA]', error);
        res.status(500).json({ message: 'Error al crear la dependencia.' }); 
    }
};

// Actualizar una Dependencia
exports.updateDependencia = async (req, res) => {
    const { dep_nombre, dep_responsable } = req.body;
    try {
        await pool.execute('UPDATE dependencias SET dep_nombre = ?, dep_responsable = ? WHERE id = ?', [dep_nombre || '', dep_responsable || '', req.params.id]);
        res.json({ message: 'Dependencia actualizada con éxito.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO DEPENDENCIA]', error);
        res.status(500).json({ message: 'Error al actualizar la dependencia.' });
    }
};

// Eliminar una Dependencia y en cascada sus oficinas asociadas
exports.deleteDependencia = async (req, res) => {
    try {
        // Mantenemos la lógica de negocio original borrando primero oficinas y luego dependencia
        await pool.execute('DELETE FROM oficinas WHERE id_dependencia = ?', [req.params.id]);
        await pool.execute('DELETE FROM dependencias WHERE id = ?', [req.params.id]);
        res.json({ message: 'Dependencia y sus oficinas eliminadas con éxito.' });
    } catch (error) { 
        console.error('[ERROR ELIMINANDO DEPENDENCIA]', error);
        res.status(500).json({ message: 'Error al eliminar la dependencia.' }); 
    }
};

// Crear una Oficina / Interno nuevo
exports.createOficina = async (req, res) => {
    const { id_dependencia, ofi_oficina, ofi_ubicacion, ofi_nronuevo } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO oficinas (id_dependencia, ofi_oficina, ofi_ubicacion, ofi_nronuevo, ofi_usuario, ofi_visible) VALUES (?, ?, ?, ?, ?, 1)', 
            [id_dependencia, ofi_oficina || '', ofi_ubicacion || '', ofi_nronuevo || '', '']
        );
        res.json({ message: 'Oficina creada con éxito.', id: result.insertId });
    } catch (error) { 
        console.error('[ERROR CREANDO OFICINA]', error);
        res.status(500).json({ message: 'Error al crear la oficina.' }); 
    }
};

// Actualizar una Oficina
exports.updateOficina = async (req, res) => {
    const { ofi_oficina, ofi_nronuevo, ofi_ubicacion, ofi_usuario } = req.body;
    try {
        await pool.execute(
            'UPDATE oficinas SET ofi_oficina = ?, ofi_nronuevo = ?, ofi_ubicacion = ?, ofi_usuario = ? WHERE id = ?',
            [ofi_oficina || '', ofi_nronuevo || '', ofi_ubicacion || '', ofi_usuario || '', req.params.id]
        );
        res.json({ message: 'Oficina actualizada con éxito.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO OFICINA]', error);
        res.status(500).json({ message: 'Error al actualizar la oficina.' });
    }
};

// Eliminar una Oficina
exports.deleteOficina = async (req, res) => {
    try {
        await pool.execute('DELETE FROM oficinas WHERE id = ?', [req.params.id]);
        res.json({ message: 'Oficina eliminada con éxito.' });
    } catch (error) { 
        console.error('[ERROR ELIMINANDO OFICINA]', error);
        res.status(500).json({ message: 'Error al eliminar la oficina.' }); 
    }
};

// ==========================================
// --- API DE FINANZAS (TARJETAS) ---
// ==========================================

// Obtener coeficientes de tarjetas formateando la fecha a Mes/Año
exports.getTarjetas = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT *, DATE_FORMAT(ultima_actualizacion, "%M/%Y") as mes_actualizacion FROM interes_tarjetas ORDER BY cuotas ASC');
        res.json(rows);
    } catch (error) {
        console.error('[ERROR OBTENIENDO FINANCIAMIENTO]', error);
        res.status(500).json({ message: 'Error al obtener los datos de financiamiento.' });
    }
};

// Actualizar coeficiente (Solo Admin)
exports.updateCoeficiente = async (req, res) => {
    const { id } = req.params;
    const { coeficiente } = req.body;
    if (coeficiente === undefined || isNaN(parseFloat(coeficiente))) {
        return res.status(400).json({ message: 'Coeficiente inválido.' });
    }
    try {
        const [result] = await pool.execute('UPDATE interes_tarjetas SET coeficiente = ? WHERE id = ?', [coeficiente, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado.' });
        res.json({ message: 'Coeficiente actualizado exitosamente.' });
    } catch (error) {
        console.error('[ERROR ACTUALIZANDO COEFICIENTE]', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar.' });
    }
};