// server.js - VERSIÓN PARA RENDER CON INSTALACIÓN AUTOMÁTICA DE RUST365
const express = require('express');
const multer = require('multer');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================
// INSTALAR RUST365 AUTOMÁTICAMENTE AL INICIAR
// ============================================================
console.log('🔧 Verificando e instalando rust365...');

function instalarRust365() {
    try {
        // Verificar si rust365 ya está instalado
        try {
            const version = execSync('rust365 --version', { encoding: 'utf8' });
            console.log(`✅ rust365 ya está instalado: ${version.trim()}`);
            return true;
        } catch (e) {
            console.log('📦 rust365 no encontrado. Instalando...');
        }

        // Instalar rust365 usando cargo
        console.log('⬇️ Descargando e instalando rust365...');
        execSync('cargo install rust365', { 
            encoding: 'utf8', 
            stdio: 'inherit',
            timeout: 300000 // 5 minutos
        });
        
        console.log('✅ rust365 instalado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al instalar rust365:', error);
        return false;
    }
}

// Instalar rust365 al iniciar (en segundo plano para no bloquear)
let rust365Instalado = false;
setTimeout(() => {
    rust365Instalado = instalarRust365();
}, 1000);

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

// Verificar si rust365 está disponible (con instalación automática)
app.get('/api/verificar-rust', (req, res) => {
    // Verificar si rust365 está disponible
    try {
        const version = execSync('rust365 --version', { encoding: 'utf8' });
        res.json({ 
            installed: true, 
            version: version.trim(),
            environment: process.env.NODE_ENV || 'production'
        });
    } catch (error) {
        // Si no está instalado, intentar instalarlo
        console.log('⚠️ rust365 no encontrado, intentando instalar...');
        const instalado = instalarRust365();
        if (instalado) {
            try {
                const version = execSync('rust365 --version', { encoding: 'utf8' });
                res.json({ 
                    installed: true, 
                    version: version.trim(),
                    environment: process.env.NODE_ENV || 'production'
                });
            } catch (e) {
                res.json({ 
                    installed: false, 
                    error: 'Error al instalar rust365',
                    details: e.message
                });
            }
        } else {
            res.json({ 
                installed: false, 
                error: 'rust365 no disponible',
                details: error.message
            });
        }
    }
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
        
        // Verificar que rust365 esté instalado antes de convertir
        try {
            execSync('rust365 --version', { encoding: 'utf8' });
        } catch (e) {
            console.log('⚠️ rust365 no encontrado, instalando...');
            instalarRust365();
        }
        
        // Ejecutar rust365
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
        uptime: process.uptime(),
        rust365: rust365Instalado ? 'instalado' : 'verificando...'
    });
});

// Ruta raíz
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