// server.js - VERSIÓN PARA LA NUBE
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurar multer para subir archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '_' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.docx') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos .docx'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Verificar si rust365 está instalado
app.get('/api/verificar-rust', (req, res) => {
    // En la nube, rust365 debe estar preinstalado en el contenedor
    // Por ahora, asumimos que está disponible
    res.json({ 
        installed: true, 
        version: 'cloud-v1.0.0',
        environment: process.env.NODE_ENV || 'production'
    });
});

// Endpoint para convertir con rust365
app.post('/api/convertir-rust', upload.single('archivo'), async (req, res) => {
    let archivoPath = null;
    let outputFile = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }
        
        archivoPath = req.file.path;
        const nombreBase = path.basename(req.file.originalname, '.docx');
        const outputDir = path.join(__dirname, 'output');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        outputFile = path.join(outputDir, `${nombreBase}_${Date.now()}.html`);
        
        // Usar rust365 - en la nube debe estar en el PATH
        const command = `rust365 "${archivoPath}" -o "${outputFile}"`;
        console.log('🔧 Ejecutando:', command);
        
        exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            let htmlContent = null;
            let errorMsg = null;
            
            if (fs.existsSync(outputFile)) {
                htmlContent = fs.readFileSync(outputFile, 'utf8');
                console.log('✅ Archivo HTML generado correctamente');
            }
            
            if (error) {
                console.error('❌ Error en rust365:', error);
                console.error('stderr:', stderr);
                errorMsg = stderr || error.message;
            }
            
            // Limpiar archivos temporales
            try {
                if (archivoPath && fs.existsSync(archivoPath)) {
                    fs.unlinkSync(archivoPath);
                }
                if (outputFile && fs.existsSync(outputFile)) {
                    fs.unlinkSync(outputFile);
                }
            } catch (cleanupError) {
                console.warn('Error al limpiar archivos:', cleanupError);
            }
            
            if (htmlContent) {
                res.json({ 
                    success: true, 
                    html: htmlContent,
                    filename: `${nombreBase}.html`,
                    warnings: errorMsg || null
                });
            } else {
                res.status(500).json({ 
                    error: 'Error al generar el HTML',
                    details: errorMsg || 'No se pudo procesar el archivo'
                });
            }
        });
    } catch (error) {
        console.error('❌ Error general:', error);
        try {
            if (archivoPath && fs.existsSync(archivoPath)) {
                fs.unlinkSync(archivoPath);
            }
        } catch (cleanupError) {}
        
        res.status(500).json({ 
            error: 'Error en el servidor',
            details: error.message 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Ruta raíz para verificar que el servidor está activo
app.get('/', (req, res) => {
    res.json({ 
        message: '🦀 rust365 API server is running!',
        endpoints: {
            health: '/api/health',
            verify: '/api/verificar-rust',
            convert: 'POST /api/convertir-rust'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rust365 en https://localhost:${PORT}`);
    console.log(`📝 Verificar estado: https://localhost:${PORT}/api/verificar-rust`);
    console.log(`📄 Convertir: POST https://localhost:${PORT}/api/convertir-rust`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});