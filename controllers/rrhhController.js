const path = require('path');
const multer = require('multer');
const fs = require('fs');

// --- CONFIGURACIÓN DE ALMACENAMIENTO DE MULTER ---
const storageRRHH = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.query.category;
        let destFolder = '';
        
        // Usamos process.cwd() para arrancar SIEMPRE desde la raíz del proyecto
        if (category === 'admision') destFolder = path.join(process.cwd(), 'public/docs/personal/form_admision');
        else if (category === 'movimiento') destFolder = path.join(process.cwd(), 'public/docs/personal/form_mov_personal');
        else if (category === 'descargas') destFolder = path.join(process.cwd(), 'public/docs/descargas');
        else if (category === 'descargas_wifi') destFolder = path.join(process.cwd(), 'public/docs/descargas_wifi');
        else if (category === 'cursos') destFolder = path.join(process.cwd(), 'public/docs/cursos');
        else if (category === 'formularios') destFolder = path.join(process.cwd(), 'public/docs/formularios');
        else if (category === 'pdfs') destFolder = path.join(process.cwd(), 'public/docs/pdfs');
        else return cb(new Error('Categoría inválida'));
        
        if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
        cb(null, destFolder);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

exports.upload = multer({ storage: storageRRHH });


// --- LÓGICA DEL CONTROLADOR ---

exports.getFiles = (req, res) => {
    const category = req.query.category;
    let folderPath = '';

    if (category === 'admision') folderPath = path.join(process.cwd(), 'public/docs/personal/form_admision');
    else if (category === 'movimiento') folderPath = path.join(process.cwd(), 'public/docs/personal/form_mov_personal');
    else if (category === 'descargas') folderPath = path.join(process.cwd(), 'public/docs/descargas');
    else if (category === 'descargas_wifi') folderPath = path.join(process.cwd(), 'public/docs/descargas_wifi');
    else if (category === 'cursos') folderPath = path.join(process.cwd(), 'public/docs/cursos');
    else if (category === 'formularios') folderPath = path.join(process.cwd(), 'public/docs/formularios');
    else if (category === 'pdfs') folderPath = path.join(process.cwd(), 'public/docs/pdfs');
    else return res.status(400).json({ message: 'Categoría inválida.' });

    // Esto te va a mostrar la ruta exacta en la terminal de VS Code
    console.log(`🔎 CONTROL: Buscando en la ruta absoluta: ${folderPath}`);

    if (!fs.existsSync(folderPath)) {
        console.log(`⚠️ Alerta: La carpeta no existe en: ${folderPath}`);
        return res.json([]); 
    }

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('[ERROR LEYENDO DIRECTORIO]', err);
            return res.status(500).json({ message: 'Error al leer los archivos.' });
        }
        
        const filteredFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.pdf', '.doc', '.docx'].includes(ext);
        });
        res.json(filteredFiles);
    });
};

exports.uploadSuccess = (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No se pudo subir el archivo.' });
    res.json({ message: `Archivo '${req.file.originalname}' subido exitosamente.` });
};

exports.deleteFile = (req, res) => {
    const { filename } = req.params;
    const category = req.query.category;
    let folderPath = '';

    if (category === 'admision') folderPath = path.join(process.cwd(), 'public/docs/personal/form_admision');
    else if (category === 'movimiento') folderPath = path.join(process.cwd(), 'public/docs/personal/form_mov_personal');
    else if (category === 'descargas') folderPath = path.join(process.cwd(), 'public/docs/descargas');
    else if (category === 'descargas_wifi') folderPath = path.join(process.cwd(), 'public/docs/descargas_wifi');
    else if (category === 'cursos') folderPath = path.join(process.cwd(), 'public/docs/cursos');
    else if (category === 'formularios') folderPath = path.join(process.cwd(), 'public/docs/formularios');
    else if (category === 'pdfs') folderPath = path.join(process.cwd(), 'public/docs/pdfs');
    else return res.status(400).json({ message: 'Categoría inválida.' });

    const filePath = path.join(folderPath, filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('[ERROR BORRANDO ARCHIVO]', err);
            return res.status(500).json({ message: 'No se pudo eliminar el archivo del servidor.' });
        }
        res.json({ message: 'Archivo eliminado exitosamente de la intranet.' });
    });
};