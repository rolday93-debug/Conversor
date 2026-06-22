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

// Configurar multer
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

// Verificar rust365
app.get('/api/verificar-rust', (req, res) => {
    try {
        const { execSync } = require('child_process');
        const version = execSync('rust365 --version', { encoding: 'utf8' });
        res.json({ 
            installed: true, 
            version: version.trim(),
            environment: process.env.NODE_ENV || 'production'
        });
    } catch (error) {
        res.json({ 
            installed: false, 
            error: 'rust365 no disponible',
            details: error.message
        });
    }
});

// Endpoint de conversión
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
    console.log(`🚀 Servidor rust365 en puerto ${PORT}`);
    console.log(`📝 Verificar estado: /api/verificar-rust`);
    console.log(`📄 Convertir: POST /api/convertir-rust`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});