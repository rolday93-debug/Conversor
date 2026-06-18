// ============================================================
// CONVERSOR WORD A HTML - VERSIÓN CON EXPORTACIÓN DE IMÁGENES
// ============================================================

let modoEdicion = false;
let htmlActual = '';
let celdasSeleccionadas = new Set();
let observerTablas = null;
let observerImagenes = null;
let imagenSeleccionada = null;
let savedSelection = null;
let ultimoBloqueSangria = null;
let htmlAntesSangria = null;
let ultimoBloqueSangriaTexto = null;
let contadorImagenesGlobal = 0;

// ============================================================
// NUEVAS FUNCIONES PARA MANEJO DE IMÁGENES Y ZIP
// ============================================================

// Genera un ID único para cada imagen
function generarIdUnico() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    contadorImagenesGlobal++;
    return `img_${timestamp}_${random}_${contadorImagenesGlobal}`;
}

// Convierte base64 a Blob
function base64ToBlob(base64) {
    const partes = base64.split(';base64,');
    const contentType = partes[0].split(':')[1];
    const raw = window.atob(partes[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; i++) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}

// Procesa todas las imágenes del HTML y prepara datos para el ZIP
async function procesarImagenesYGenerarZip(htmlContent, nombreArchivo) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const imagenes = doc.querySelectorAll('img');
    
    const imagenesProcesadas = [];
    const reemplazos = new Map();
    
    for (let i = 0; i < imagenes.length; i++) {
        const img = imagenes[i];
        const src = img.getAttribute('src');
        
        // Solo procesar imágenes base64 o rutas locales
        if (src && src.startsWith('data:image')) {
            const uniqueId = generarIdUnico();
            const mimeMatch = src.match(/data:image\/(\w+);base64,/);
            let extension = 'png';
            if (mimeMatch && mimeMatch[1]) {
                extension = mimeMatch[1].toLowerCase();
                if (extension === 'jpeg') extension = 'jpg';
            }
            
            const nuevoNombre = `${uniqueId}.${extension}`;
            const rutaRelativa = `imagenes/${nuevoNombre}`;
            const blob = base64ToBlob(src);
            
            imagenesProcesadas.push({
                nombre: nuevoNombre,
                blob: blob,
                rutaRelativa: rutaRelativa,
                id: uniqueId
            });
            
            reemplazos.set(src, rutaRelativa);
        } else if (src && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('https')) {
            // Si ya es una ruta relativa, asegurar que apunte a la carpeta imagenes/
            if (!src.includes('imagenes/')) {
                const nombreArchivoImagen = src.split('/').pop();
                const rutaRelativa = `imagenes/${nombreArchivoImagen}`;
                reemplazos.set(src, rutaRelativa);
            }
        }
    }
    
    // Reemplazar todas las rutas en el HTML
    let htmlModificado = htmlContent;
    for (const [oldSrc, newSrc] of reemplazos) {
        const escapedOldSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedOldSrc, 'g');
        htmlModificado = htmlModificado.replace(regex, newSrc);
    }
    
    return {
        html: htmlModificado,
        imagenes: imagenesProcesadas
    };
}

// Genera el archivo HTML completo con codificación UTF-8
function generarDocumentoCompletoConImagenes(contenidoMejorado, tituloPersonalizado, hayImagenes = false) {
    const cssExportado = `
        /* ========== RESET Y BASE ========== */
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --primary-light: #3b82f6;
            --primary-subtle: #eff6ff;
            --secondary: #64748b;
            --success: #059669;
            --warning: #d97706;
            --danger: #dc2626;
            --bg-body: #cbd5e1;
            --bg-card: #ffffff;
            --bg-elevated: #f8fafc;
            --bg-hover: #f1f5f9;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --text-inverse: #ffffff;
            --shadow-xs: 0 1px 1px 0 rgb(0 0 0 / 0.03);
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
            --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04);
            --radius: 10px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --radius-xl: 20px;
            --radius-full: 9999px;
            --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
            --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
            --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg-body);
            min-height: 100vh;
            padding: 2rem;
            color: var(--text-main);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        .pagina {
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
            margin: 0.25rem auto;
            padding: 2rem;
            border-radius: 8px;
            max-width: 1100px;
            break-inside: avoid;
            page-break-inside: avoid;
            transition: box-shadow 0.2s;
        }
        .pagina:first-child { margin-top: 0; }
        .pagina:last-child { margin-bottom: 0; }

        .pagina:first-child .header-integrado {
            background: white;
            padding: 0.4rem 2rem;
            border-bottom: 2px solid;
            border-image: linear-gradient(90deg, #1e3a8a, #60a5fa, #1e3a8a) 1;
            border-image-slice: 1;
            margin: -2rem -2rem 2rem -2rem;
            border-radius: 8px 8px 0 0;
        }
        .pagina:last-child .footer-integrado {
            background: #f8fafc;
            padding: 1rem 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            margin: 2rem -2rem -2rem -2rem;
            border-radius: 0 0 8px 8px;
        }
        .documento-titulo {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 1.3rem;
            font-weight: 600;
            letter-spacing: -0.3px;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.6rem;
            color: #0f172a;
        }

        .tabla-con-bordes {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            margin: 1.5em 0;
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
        }
        .tabla-con-bordes th,
        .tabla-con-bordes td {
            border: 1px solid var(--border);
            padding: 12px 16px;
            text-align: left;
            vertical-align: top;
            position: relative;
            background: white;
        }
        .tabla-con-bordes th {
            background-color: #f8fafc;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .tabla-con-bordes tr:nth-child(even) td {
            background-color: #fafafa;
        }

        .pagina img:not(.icono-insertado) {
            max-width: 100%;
            height: auto;
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            margin: 1rem auto;
            display: block;
        }
        .icono-insertado {
            display: inline-block !important;
            vertical-align: middle;
            max-width: 32px;
            max-height: 32px;
        }
        .logo-revista {
            display: block;
            margin: 1rem auto;
            max-width: 120px;
            opacity: 1;
        }

        .pagina ul, .pagina ol {
            margin: 0.75em 0;
            padding-left: 2em;
        }
        .pagina li {
            margin-bottom: 0.25em;
            line-height: 1.6;
        }

        .tipo-articulo { margin: 0.5em 0 0.5em 0; }
        .autor, .grupo-autores { margin: 0.5em 0; }
        .afiliacion, .grupo-afiliaciones { margin: 0.5em 0; }
        .resumen-titulo { margin: 1em 0 0.5em 0; }
        .seccion-titulo { margin: 1.5em 0 1em 0; }

        @media print {
            body { background: white; padding: 0; }
            .pagina { box-shadow: none; margin: 0; page-break-after: always; }
            .pagina:first-child .header-integrado { margin: 0; border-bottom: 1px solid #ccc; }
            .pagina:last-child .footer-integrado { margin: 0; border-top: 1px solid #ccc; }
        }
    `;
    
    const escapeHTML = (str) => str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
    
    let htmlConPaginas = contenidoMejorado;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlConPaginas;
    const primerasPaginas = tempDiv.querySelectorAll('.pagina');
    if (primerasPaginas.length > 0) {
        primerasPaginas.forEach(pagina => {
            const headerExistente = pagina.querySelector('.header-integrado');
            const footerExistente = pagina.querySelector('.footer-integrado');
            if (headerExistente) headerExistente.remove();
            if (footerExistente) footerExistente.remove();
        });
        const primeraPagina = primerasPaginas[0];
        const headerHtml = `<div class="header-integrado"><h1 class="documento-titulo">📄 ${escapeHTML(tituloPersonalizado)}</h1></div>`;
        primeraPagina.insertAdjacentHTML('afterbegin', headerHtml);
        const ultimaPagina = primerasPaginas[primerasPaginas.length - 1];
        const footerHtml = `<div class="footer-integrado"><p>Documento generado con Conversor Word a HTML</p></div>`;
        ultimaPagina.insertAdjacentHTML('beforeend', footerHtml);
    }
    htmlConPaginas = tempDiv.innerHTML;
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(tituloPersonalizado)}</title>
    <style>
${cssExportado}
    </style>
</head>
<body>
    ${htmlConPaginas}
</body>
</html>`;
}

// ============================================================
// CONFIGURACIÓN DE DESCARGA CON SOPORTE PARA ZIP
// ============================================================
async function configurarDescarga() {
    const descargarBtn = document.getElementById('descargarBtn');
    const descargarZipBtn = document.getElementById('descargarZipBtn');
    
    if (!descargarBtn) return;
    
    // Descarga simple HTML (sin imágenes empaquetadas)
    descargarBtn.onclick = async () => {
        if (modoEdicion) {
            const result = await Swal.fire({
                title: '¿Guardar cambios?',
                text: 'Estás en modo edición. ¿Guardar antes de descargar?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#059669',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'No, descargar sin guardar'
            });
            if (result.isConfirmed) guardarEdicion();
        }
        
        const finalHtml = obtenerContenidoEditable()?.innerHTML || htmlActual;
        let nombreArchivoSalida = document.getElementById('nombreArchivo').value.trim();
        if (nombreArchivoSalida === '') nombreArchivoSalida = 'documento_editado';
        
        const documentoCompleto = generarDocumentoCompletoConImagenes(finalHtml, nombreArchivoSalida);
        const blob = new Blob([documentoCompleto], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombreArchivoSalida + '.html';
        a.click();
        URL.revokeObjectURL(a.href);
        
        Swal.fire({
            icon: 'success',
            title: 'Descarga completada',
            text: `Archivo guardado como ${nombreArchivoSalida}.html`,
            confirmButtonColor: '#059669',
            timer: 2000,
            showConfirmButton: false
        });
    };
    
    // Descarga ZIP con imágenes
    if (descargarZipBtn) {
        descargarZipBtn.onclick = async () => {
            if (modoEdicion) {
                const result = await Swal.fire({
                    title: '¿Guardar cambios?',
                    text: 'Estás en modo edición. ¿Guardar antes de exportar?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#059669',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'No, exportar sin guardar'
                });
                if (result.isConfirmed) guardarEdicion();
            }
            
            const finalHtml = obtenerContenidoEditable()?.innerHTML || htmlActual;
            let nombreArchivoSalida = document.getElementById('nombreArchivo').value.trim();
            if (nombreArchivoSalida === '') nombreArchivoSalida = 'documento_editado';
            
            // Mostrar loading
            Swal.fire({
                title: 'Procesando imágenes...',
                text: 'Empaquetando archivos, por favor espera',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            try {
                // Procesar imágenes y generar HTML con rutas relativas
                const { html: htmlConRutas, imagenes } = await procesarImagenesYGenerarZip(finalHtml, nombreArchivoSalida);
                
                // Generar el documento HTML completo
                const documentoCompleto = generarDocumentoCompletoConImagenes(htmlConRutas, nombreArchivoSalida, imagenes.length > 0);
                
                // Crear el ZIP
                const zip = new JSZip();
                zip.file(`${nombreArchivoSalida}.html`, documentoCompleto);
                
                // Añadir carpeta de imágenes si hay imágenes
                if (imagenes.length > 0) {
                    const imagenesFolder = zip.folder("imagenes");
                    for (const img of imagenes) {
                        imagenesFolder.file(img.nombre, img.blob);
                    }
                }
                
                // Generar y descargar el ZIP
                const content = await zip.generateAsync({ type: "blob" });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = `${nombreArchivoSalida}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Exportación completada',
                    html: `Archivo guardado como <strong>${nombreArchivoSalida}.zip</strong><br>${imagenes.length} imagen(es) empaquetada(s)`,
                    confirmButtonColor: '#059669'
                });
            } catch (error) {
                console.error('Error al crear ZIP:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al exportar',
                    text: 'Ocurrió un error al empaquetar las imágenes',
                    confirmButtonColor: '#ef4444'
                });
            }
        };
    }
}

// ============================================================
// FUNCIÓN PARA DETECTAR IMÁGENES Y MOSTRAR BOTÓN ZIP (MEJORADA)
// ============================================================
function actualizarBotonZip() {
    const descargarZipBtn = document.getElementById('descargarZipBtn');
    if (!descargarZipBtn) return;
    
    // Buscar el contenido en la vista previa
    const vistaDiv = document.getElementById('vistaPrevia');
    const contenido = vistaDiv?.querySelector('.contenido-convertido');
    
    if (contenido) {
        const imagenes = contenido.querySelectorAll('img');
        // Verificar si hay al menos una imagen en base64
        const hayImagenesBase64 = Array.from(imagenes).some(img => {
            const src = img.getAttribute('src');
            return src && src.startsWith('data:image');
        });
        
        // Mostrar el botón si hay imágenes base64 O si el documento está visible
        if (imagenes.length > 0 && hayImagenesBase64) {
            descargarZipBtn.style.display = 'inline-flex';
            console.log('✅ Botón ZIP visible: hay imágenes base64');
        } else {
            // También mostrar si hay imágenes con rutas relativas (para HTMLs editados)
            const hayImagenesRelativas = Array.from(imagenes).some(img => {
                const src = img.getAttribute('src');
                return src && !src.startsWith('data:') && !src.startsWith('http');
            });
            
            if (imagenes.length > 0 && hayImagenesRelativas) {
                descargarZipBtn.style.display = 'inline-flex';
                console.log('✅ Botón ZIP visible: hay imágenes con rutas relativas');
            } else {
                descargarZipBtn.style.display = 'none';
                console.log('❌ Botón ZIP oculto: no hay imágenes para empaquetar');
            }
        }
    } else {
        descargarZipBtn.style.display = 'none';
        console.log('❌ Botón ZIP oculto: no hay contenido');
    }
}
// ============================================================
// UTILIDADES DE SELECCIÓN
// ============================================================
function guardarSeleccion() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedSelection = sel.getRangeAt(0).cloneRange();
}
function restaurarSeleccion() {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
        return true;
    }
    return false;
}
function obtenerRangoActual() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) return sel.getRangeAt(0);
    const contenido = obtenerContenidoEditable();
    if (contenido) {
        const range = document.createRange();
        range.selectNodeContents(contenido);
        range.collapse(false);
        return range;
    }
    return null;
}

// ============================================================
// MANEJADOR DE IMÁGENES
// ============================================================
function crearConvertidorImagenes() {
    return mammoth.images.imgElement(function(image) {
        return image.readAsBase64String()
            .then(function(base64String) {
                console.log(`✅ Imagen convertida: ${image.contentType}`);
                return {
                    src: `data:${image.contentType};base64,${base64String}`,
                    alt: "Imagen del documento",
                    class: "imagen-convertida",
                    style: "max-width:100%; height:auto; display:block; margin:1rem auto;"
                };
            })
            .catch(function(err) {
                console.error(`❌ Error en imagen: ${err.message}`);
                return {
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect width='200' height='150' fill='%23f1f5f9' stroke='%2394a3b8' stroke-width='2' stroke-dasharray='6'/%3E%3Ctext x='50%25' y='50%25' font-size='12' text-anchor='middle' fill='%2364748b'%3EImagen no disponible%3C/text%3E%3C/svg%3E",
                    alt: "Imagen no disponible",
                    style: "max-width:100%; margin:0.5em auto; display:block;"
                };
            });
    });
}

// ============================================================
// LIMPIEZA DE ESTILOS
// ============================================================
function limpiarEstilosResumen(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlFragment;
    function eliminarNegritas(elemento) {
        elemento.querySelectorAll('strong, b').forEach(el => {
            const span = document.createElement('span');
            span.innerHTML = el.innerHTML;
            span.style.fontWeight = 'normal';
            el.parentNode.replaceChild(span, el);
        });
        elemento.querySelectorAll('[style*="font-weight"]').forEach(el => {
            if (el.style.fontWeight === 'bold' || el.style.fontWeight === '700')
                el.style.fontWeight = 'normal';
        });
    }
    const resumenTitulo = tempDiv.querySelector('.resumen-titulo');
    if (resumenTitulo) {
        resumenTitulo.style.removeProperty('display');
        resumenTitulo.style.removeProperty('border-bottom');
        resumenTitulo.style.removeProperty('padding-bottom');
        resumenTitulo.style.textAlign = '';
        let hermano = resumenTitulo.nextElementSibling;
        while (hermano && !hermano.classList?.contains('palabras-clave') && !hermano.classList?.contains('historico')) {
            eliminarNegritas(hermano);
            hermano.style.removeProperty('text-align');
            hermano = hermano.nextElementSibling;
        }
    }
    const palabrasClave = tempDiv.querySelectorAll('.palabras-clave');
    palabrasClave.forEach(p => eliminarNegritas(p));
    return tempDiv.innerHTML;
}

function limpiarEstilosSecciones(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlFragment;
    const seccionesCriticas = ['métodos', 'resultados', 'discusión', 'conclusiones', 'referencias'];
    const titulosSeccion = tempDiv.querySelectorAll('.seccion-titulo');
    titulosSeccion.forEach(titulo => {
        const textoSeccion = titulo.textContent.toLowerCase();
        if (seccionesCriticas.some(palabra => textoSeccion.includes(palabra))) {
            let hermano = titulo.nextElementSibling;
            while (hermano && !hermano.classList?.contains('seccion-titulo')) {
                if (hermano.style) {
                    hermano.style.removeProperty('font-style');
                    hermano.style.removeProperty('color');
                    hermano.style.removeProperty('background');
                    hermano.style.removeProperty('font-family');
                }
                if (hermano.classList) {
                    const clasesAEliminar = Array.from(hermano.classList).filter(c => 
                        c.includes('italic') || c.includes('gray') || c.includes('light') || c.includes('muted')
                    );
                    clasesAEliminar.forEach(c => hermano.classList.remove(c));
                }
                if (hermano.tagName === 'P') {
                    hermano.style.fontStyle = 'normal';
                    hermano.style.color = 'inherit';
                }
                hermano = hermano.nextElementSibling;
            }
        }
    });
    return tempDiv.innerHTML;
}

function agruparSeccionesContinuas(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlFragment;
    function agrupar(tipoClase, contenedorClass) {
        const elementos = Array.from(tempDiv.children);
        for (let i = 0; i < elementos.length; i++) {
            const elem = elementos[i];
            if (elem.classList && elem.classList.contains(tipoClase)) {
                let j = i + 1;
                while (j < elementos.length && elementos[j].classList && elementos[j].classList.contains(tipoClase)) j++;
                if (j - i > 1) {
                    const contenedor = document.createElement('div');
                    contenedor.className = contenedorClass;
                    for (let k = i; k < j; k++) contenedor.appendChild(elementos[k].cloneNode(true));
                    tempDiv.replaceChild(contenedor, elementos[i]);
                    for (let k = i + 1; k < j; k++) elementos[k].remove();
                    return true;
                }
            }
        }
        return false;
    }
    let again = true;
    while (again) {
        again = false;
        if (agrupar('autor', 'grupo-autores')) again = true;
        if (agrupar('afiliacion', 'grupo-afiliaciones')) again = true;
    }
    return tempDiv.innerHTML;
}

function aplicarListaLetras() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero', confirmButtonColor: '#f59e0b' });
        return;
    }
    contenido.focus();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let lista = node.closest('ol, ul');
    
    if (lista && lista.tagName === 'OL') {
        lista.style.listStyleType = 'lower-alpha';
    } else {
        document.execCommand('insertOrderedList', false, null);
        lista = contenido.querySelector('ol:last-of-type');
        if (lista) lista.style.listStyleType = 'lower-alpha';
    }
}

function aplicarListaRomanos() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero', confirmButtonColor: '#f59e0b' });
        return;
    }
    contenido.focus();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let lista = node.closest('ol, ul');
    
    if (lista && lista.tagName === 'OL') {
        lista.style.listStyleType = 'upper-roman';
    } else {
        document.execCommand('insertOrderedList', false, null);
        lista = contenido.querySelector('ol:last-of-type');
        if (lista) lista.style.listStyleType = 'upper-roman';
    }
}

function agruparResumen(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlFragment;
    const resumenTitulo = tempDiv.querySelector('.resumen-titulo');
    if (resumenTitulo) {
        let hermano = resumenTitulo.nextElementSibling;
        while (hermano && !hermano.classList?.contains('palabras-clave') && !hermano.classList?.contains('historico')) {
            if (hermano.tagName === 'P' || hermano.tagName === 'DIV') hermano.classList.add('resumen-contenido');
            hermano = hermano.nextElementSibling;
        }
    }
    return tempDiv.innerHTML;
}

function procesarSaltosPagina(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlFragment;
    const pageBreaks = tempDiv.querySelectorAll('div[style*="page-break-before: always"]');
    pageBreaks.forEach(div => {
        const separator = document.createElement('div');
        separator.className = 'salto-pagina-visual';
        separator.innerHTML = `
            <div class="salto-pagina-contenedor">
                <hr class="linea-superior">
                <span class="etiqueta-salto">📄 Salto de página</span>
                <hr class="linea-inferior">
            </div>
        `;
        div.parentNode.replaceChild(separator, div);
    });
    return tempDiv.innerHTML;
}

function mejorarEstructuraHTML(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.className = 'contenido-convertido';
    tempDiv.innerHTML = htmlFragment;
    const elementos = Array.from(tempDiv.querySelectorAll('*'));
    elementos.forEach(elem => {
        if (elem.nodeType !== Node.ELEMENT_NODE || !elem.tagName) return;
        const tag = elem.tagName.toLowerCase();
        const texto = elem.textContent.trim();
        const textoLower = texto.toLowerCase();
        if (elem === tempDiv.firstElementChild && tag === 'p' && (texto.includes('Artículo Original') || texto.includes('Original Article'))) {
            elem.classList.add('tipo-articulo');
        } else if (tag === 'p' && (texto.includes('^') || texto.includes('orcid.org'))) {
            elem.classList.add('autor');
        } else if (tag === 'p' && (texto.match(/^\^[0-9]+\^/) || textoLower.includes('universidad') || textoLower.includes('instituto'))) {
            elem.classList.add('afiliacion');
        } else if (tag === 'p' && (textoLower.includes('autor para correspondencia') || textoLower.includes('corresponding author'))) {
            elem.classList.add('correspondencia');
        } else if (tag === 'p' && (texto === 'RESUMEN' || texto === 'ABSTRACT')) {
            elem.classList.add('resumen-titulo');
            elem.style.removeProperty('text-align');
        } else if (tag === 'p' && (textoLower.startsWith('palabras clave:') || textoLower.startsWith('keywords:'))) {
            elem.classList.add('palabras-clave');
        } else if (tag === 'p' && (textoLower.startsWith('recibido:') || textoLower.startsWith('aprobado:'))) {
            elem.classList.add('historico');
        } else if (tag === 'p' && texto.match(/^(INTRODUCCIÓN|MÉTODOS|RESULTADOS|DISCUSIÓN|REFERENCIAS|CONCLUSIONES)/i)) {
            elem.classList.add('seccion-titulo');
        } else if (tag === 'table') {
            elem.classList.add('tabla-con-bordes');
        } else if (tag === 'p' && texto.match(/^(Tabla|Cuadro|Table)\s+\d+/i)) {
            elem.classList.add('tabla-titulo');
        } else if (tag === 'p' && texto.match(/^(Fig\.?|Figura|Figure)\s+\d+/i)) {
            elem.classList.add('figura-titulo');
        } else if (tag === 'img') {
            elem.classList.add('imagen-convertida');
        } else if (tag === 'p' && (texto.match(/^\[\d+\]/) || (texto.match(/^\d+\./) && texto.length > 50))) {
            elem.classList.add('referencia');
        } else if (tag === 'p' && texto.length > 0) {
            elem.classList.add('parrafo-normal');
        }
    });
    let htmlResultado = tempDiv.innerHTML;
    htmlResultado = limpiarEstilosResumen(htmlResultado);
    htmlResultado = limpiarEstilosSecciones(htmlResultado);
    htmlResultado = agruparSeccionesContinuas(htmlResultado);
    htmlResultado = agruparResumen(htmlResultado);
    htmlResultado = procesarSaltosPagina(htmlResultado);
    const tempDiv2 = document.createElement('div');
    tempDiv2.innerHTML = htmlResultado;
    if (!tempDiv2.querySelector('.pagina')) {
        const contenido = tempDiv2.innerHTML;
        tempDiv2.innerHTML = `<div class="pagina">${contenido}</div>`;
    }
    htmlResultado = tempDiv2.innerHTML;
    return htmlResultado;
}

function estructurarContenido(htmlFragment) {
    let html = procesarSaltosPagina(htmlFragment);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    if (!tempDiv.querySelector('.pagina')) {
        const contenido = tempDiv.innerHTML;
        tempDiv.innerHTML = `<div class="pagina">${contenido}</div>`;
    }
    tempDiv.querySelectorAll('.pagina').forEach(pag => {
        pag.setAttribute('contenteditable', 'true');
    });
    return tempDiv.innerHTML;
}

function initDragAndDrop() {
    const dropZone = document.querySelector('.upload-zone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.docx')) {
                const fileInput = document.getElementById('inputWord');
                fileInput.files = files;
                const fileNameSpan = document.getElementById('nombreArchivoSeleccionado');
                if (fileNameSpan) fileNameSpan.textContent = file.name;
                Swal.fire({
                    icon: 'success',
                    title: 'Archivo cargado',
                    text: `${file.name} listo para convertir`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Formato incorrecto',
                    text: 'Solo se permiten archivos .docx',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    });
}

// ============================================================
// EDITOR - FUNCIONES DE FORMATO
// ============================================================
function obtenerContenidoEditable() {
    const vistaDiv = document.getElementById('vistaPrevia');
    return vistaDiv?.querySelector('.contenido-convertido');
}

const SIZE_MAP = {'1':'10px','2':'13px','3':'16px','4':'18px','5':'24px','6':'32px','7':'48px'};

function actualizarSelectores() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const node = selection.getRangeAt(0).startContainer;
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!element) return;
    let fontElement = element;
    while (fontElement && fontElement !== obtenerContenidoEditable()) {
        const style = window.getComputedStyle(fontElement);
        if (style.fontFamily !== 'inherit' || style.fontSize !== 'inherit') break;
        fontElement = fontElement.parentElement;
    }
    const computedStyle = window.getComputedStyle(fontElement);
    const fontSizePx = computedStyle.fontSize;
    const fuenteSelect = document.getElementById('fuenteSelect');
    if (fuenteSelect) {
        let currentFont = '';
        let targetElement = fontElement;
        while (targetElement && targetElement !== obtenerContenidoEditable()) {
            const style = window.getComputedStyle(targetElement);
            if (style.fontFamily && style.fontFamily !== 'inherit') {
                currentFont = style.fontFamily.replace(/["']/g, '').toLowerCase();
                break;
            }
            targetElement = targetElement.parentElement;
        }
        if (currentFont) {
            const fuentes = Array.from(fuenteSelect.options).map(o => o.value.toLowerCase());
            let matchIndex = -1;
            fuentes.forEach((f, idx) => {
                if (currentFont.includes(f) || f.includes(currentFont.split(',')[0])) matchIndex = idx;
            });
            if (matchIndex >= 0) fuenteSelect.selectedIndex = matchIndex;
        }
    }
    const tamanoSelect = document.getElementById('tamanoSelect');
    if (tamanoSelect && fontSizePx) {
        const px = parseInt(fontSizePx);
        let bestMatch = '3';
        let minDiff = 100;
        for (let i = 1; i <= 7; i++) {
            let val = parseInt(SIZE_MAP[i.toString()]);
            let diff = Math.abs(val - px);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = i.toString();
            }
        }
        tamanoSelect.value = bestMatch;
    }
    actualizarBotonesActivos();
}

function actualizarBotonesActivos() {
    try {
        document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
            const cmd = btn.getAttribute('data-cmd');
            if (['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'].includes(cmd)) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });
    } catch(e) {}
}

document.addEventListener('selectionchange', () => { if (modoEdicion) actualizarSelectores(); });

function obtenerBloquesSeleccionados() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return new Set();
    const range = selection.getRangeAt(0);
    const contenido = obtenerContenidoEditable();
    if (!contenido) return new Set();
    const bloques = new Set();
    function añadirBloque(elemento) {
        let bloque = elemento.closest('p, h1, h2, h3, h4, div, li, td, th');
        if (bloque && bloque !== contenido) bloques.add(bloque);
    }
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: function(node) {
                if (node === contenido) return NodeFilter.FILTER_SKIP;
                if (range.intersectsNode(node)) {
                    añadirBloque(node);
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );
    while (walker.nextNode()) {}
    if (range.startContainer.nodeType === Node.TEXT_NODE) añadirBloque(range.startContainer.parentElement);
    if (range.endContainer.nodeType === Node.TEXT_NODE) añadirBloque(range.endContainer.parentElement);
    return bloques;
}

function aplicarTamañoAFuente(sizePx) {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
    
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        Swal.fire({ icon: 'info', title: 'Sin selección', text: 'Selecciona un texto para cambiar el tamaño.', confirmButtonColor: '#3b82f6' });
        return;
    }
    
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = sizePx;
        span.innerHTML = '\u200B';
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        try {
            const span = document.createElement('span');
            span.style.fontSize = sizePx;
            range.surroundContents(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } catch (e) {
            const span = document.createElement('span');
            span.style.fontSize = sizePx;
            const contenido = range.extractContents();
            span.appendChild(contenido);
            range.insertNode(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
}

function aplicarAlineacionTexto(align) {
    const selection = window.getSelection();
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;

    let bloques = new Set();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (selection.isCollapsed) {
            let node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            let bloque = node.closest('p, h1, h2, h3, h4, h5, h6, div, li, td, th');
            if (bloque && bloque !== contenido) bloques.add(bloque);
        } else {
            const walker = document.createTreeWalker(
                range.commonAncestorContainer,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: function(node) {
                        if (node === contenido) return NodeFilter.FILTER_SKIP;
                        if (range.intersectsNode(node)) {
                            let bloque = node.closest('p, h1, h2, h3, h4, h5, h6, div, li, td, th');
                            if (bloque && bloque !== contenido) bloques.add(bloque);
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            while (walker.nextNode()) {}
        }
    }

    if (bloques.size > 0) {
        bloques.forEach(bloque => {
            bloque.style.textAlign = align;
        });
    } else {
        try {
            let cmd = `justify${align.charAt(0).toUpperCase() + align.slice(1)}`;
            if (align === 'justify') cmd = 'justifyFull';
            document.execCommand(cmd, false, null);
        } catch(e) {
            console.warn('Error al aplicar alineación con execCommand', e);
        }
    }
}

function aplicarComando(cmd, valor = null) {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') return;
    contenido.focus();
    setTimeout(() => {
        if (cmd === 'fontName') {
            aplicarFuenteConSpan(valor);
        } else if (cmd === 'fontSize') {
            const sizePx = SIZE_MAP[valor] || '16px';
            aplicarTamañoAFuente(sizePx);
        } else if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight' || cmd === 'justifyFull') {
            let align = cmd.replace('justify', '').toLowerCase();
            if (align === 'full') align = 'justify';
            aplicarAlineacionTexto(align);
        } else if (cmd === 'superscript') {
            document.execCommand('superscript', false, null);
        } else if (cmd === 'subscript') {
            document.execCommand('subscript', false, null);
        } else if (cmd === 'undo') {
            document.execCommand('undo');
        } else if (cmd === 'redo') {
            document.execCommand('redo');
        } else {
            document.execCommand(cmd, false, valor);
        }
        actualizarSelectores();
        actualizarBotonesActivos();
        actualizarBotonZip();
    }, 5);
}

function obtenerBloqueActual() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    let node = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let bloque = node.closest('p, div, h1, h2, h3, h4, h5, h6, li, td, th, section, article');
    return bloque || node;
}

function deshacerSangria() {
    console.log('Intentando deshacer sangría. Texto guardado:', ultimoBloqueSangriaTexto);
    
    if (!ultimoBloqueSangriaTexto) {
        Swal.fire({ icon: 'info', title: 'Sin sangría previa', text: 'Aplica una sangría a un párrafo primero.', confirmButtonColor: '#3b82f6' });
        return;
    }
    
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    
    let bloqueEncontrado = null;
    
    if (ultimoBloqueSangria && document.body.contains(ultimoBloqueSangria) && contenido.contains(ultimoBloqueSangria)) {
        bloqueEncontrado = ultimoBloqueSangria;
        console.log('✅ Bloque encontrado por referencia original');
    }
    
    if (!bloqueEncontrado) {
        const todosLosBloques = contenido.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, td, th, blockquote');
        for (let bloque of todosLosBloques) {
            if (bloque.textContent.trim() === ultimoBloqueSangriaTexto) {
                bloqueEncontrado = bloque;
                console.log('✅ Bloque encontrado por texto exacto');
                break;
            }
        }
    }
    
    if (!bloqueEncontrado) {
        const todosLosBloques = contenido.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, td, th, blockquote');
        for (let bloque of todosLosBloques) {
            if (bloque.textContent.trim().startsWith(ultimoBloqueSangriaTexto.substring(0, 50))) {
                bloqueEncontrado = bloque;
                console.log('✅ Bloque encontrado por texto parcial');
                break;
            }
        }
    }
    
    if (bloqueEncontrado && htmlAntesSangria) {
        try {
            bloqueEncontrado.outerHTML = htmlAntesSangria;
            Swal.fire({ icon: 'success', title: 'Sangría deshecha', timer: 1500, showConfirmButton: false });
            ultimoBloqueSangria = null;
            htmlAntesSangria = null;
            ultimoBloqueSangriaTexto = null;
        } catch (e) {
            console.error('Error al restaurar HTML:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo deshacer la sangría.', confirmButtonColor: '#ef4444' });
        }
    } else {
        console.warn('No se encontró el bloque original');
        Swal.fire({ icon: 'info', title: 'No se encontró el bloque', text: 'No se pudo localizar el bloque original para deshacer la sangría.', confirmButtonColor: '#3b82f6' });
        ultimoBloqueSangria = null;
        htmlAntesSangria = null;
        ultimoBloqueSangriaTexto = null;
    }
}

function insertarNuevaPagina() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero.', confirmButtonColor: '#f59e0b' });
        return;
    }
    
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed === false && selection.toString().length === 0) {
        Swal.fire({ icon: 'info', title: 'Posiciona el cursor', text: 'Coloca el cursor donde quieras dividir la página.', confirmButtonColor: '#3b82f6' });
        return;
    }
    
    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    
    let paginaActual = startContainer.nodeType === Node.TEXT_NODE 
        ? startContainer.parentElement.closest('.pagina')
        : startContainer.closest('.pagina');
    
    if (!paginaActual) {
        if (contenido.children.length === 0) return;
        const nuevaPagina = document.createElement('div');
        nuevaPagina.className = 'pagina';
        nuevaPagina.contentEditable = 'true';
        while (contenido.firstChild) nuevaPagina.appendChild(contenido.firstChild);
        contenido.appendChild(nuevaPagina);
        const nuevoRango = document.createRange();
        nuevoRango.setStart(nuevaPagina, 0);
        nuevoRango.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nuevoRango);
        Swal.fire({ icon: 'success', title: 'Página creada', timer: 1500, showConfirmButton: false });
        return;
    }
    
    const rangoDespues = document.createRange();
    rangoDespues.setStart(startContainer, startOffset);
    rangoDespues.setEnd(paginaActual, paginaActual.childNodes.length);
    
    const fragmentoDespues = rangoDespues.extractContents();
    
    const nuevaPagina = document.createElement('div');
    nuevaPagina.className = 'pagina';
    nuevaPagina.contentEditable = 'true';
    nuevaPagina.style.minHeight = '300px';
    nuevaPagina.style.padding = '2rem';
    nuevaPagina.style.backgroundColor = 'white';
    nuevaPagina.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    nuevaPagina.style.borderRadius = '8px';
    
    nuevaPagina.appendChild(fragmentoDespues);
    
    if (nuevaPagina.children.length === 0) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        nuevaPagina.appendChild(p);
    }
    
    paginaActual.insertAdjacentElement('afterend', nuevaPagina);
    
    const primerElemento = nuevaPagina.firstChild;
    const nuevoRango = document.createRange();
    if (primerElemento) {
        nuevoRango.setStart(primerElemento, 0);
        nuevoRango.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nuevoRango);
    }
    
    Swal.fire({ icon: 'success', title: 'Página dividida', timer: 1500, showConfirmButton: false });
}

function añadirPiePagina() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero.', confirmButtonColor: '#f59e0b' });
        return;
    }
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let node = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let pagina = node.closest('.pagina');
    if (!pagina) {
        Swal.fire({ icon: 'info', title: 'No hay página', text: 'El cursor debe estar dentro de una página.', confirmButtonColor: '#3b82f6' });
        return;
    }
    
    if (pagina.querySelector('.pie-pagina')) {
        Swal.fire({ icon: 'info', title: 'Ya existe pie', text: 'Esta página ya tiene un pie de página.', confirmButtonColor: '#3b82f6' });
        return;
    }
    
    const pie = document.createElement('div');
    pie.className = 'pie-pagina';
    pie.contentEditable = 'true';
    pie.innerHTML = '<hr><p class="texto-pie">Pie de página. Haz clic para editar.</p>';
    pie.style.marginTop = '2rem';
    pie.style.fontSize = '0.8rem';
    pie.style.color = '#64748b';
    pie.style.borderTop = '1px solid #e2e8f0';
    pie.style.paddingTop = '1rem';
    pagina.appendChild(pie);
    
    Swal.fire({ icon: 'success', title: 'Pie añadido', timer: 1500, showConfirmButton: false });
}

function aplicarAlineacionImagen(cmd) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    let img = null;
    if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.tagName === 'IMG') img = range.startContainer;
    else if (range.startContainer.parentElement?.tagName === 'IMG') img = range.startContainer.parentElement;
    else {
        const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        img = container?.querySelector('img');
    }
    if (img && img.tagName === 'IMG') {
        if (cmd === 'justifyCenter') { img.style.display = 'block'; img.style.marginLeft = 'auto'; img.style.marginRight = 'auto'; }
        else if (cmd === 'justifyLeft') { img.style.display = 'block'; img.style.marginLeft = '0'; img.style.marginRight = 'auto'; }
        else if (cmd === 'justifyRight') { img.style.display = 'block'; img.style.marginLeft = 'auto'; img.style.marginRight = '0'; }
        return true;
    }
    return false;
}

function cambiarFuente() {
    const select = document.getElementById('fuenteSelect');
    if (select) {
        guardarSeleccion();
        aplicarComando('fontName', select.value);
    }
}

function cambiarTamaño() { 
    const select = document.getElementById('tamanoSelect'); 
    if (select) aplicarComando('fontSize', select.value); 
}

function aplicarColor() {
    const colorPicker = document.getElementById('colorPicker');
    if (!colorPicker) return;
    const color = colorPicker.value;
    const contenido = obtenerContenidoEditable();
    if (contenido && contenido.contentEditable === 'true') {
        contenido.focus();
        document.execCommand('foreColor', false, color);
        actualizarSelectores();
    } else {
        Swal.fire({ icon: 'info', title: 'Modo edición requerido', text: 'Activa el modo edición antes de cambiar el color', confirmButtonColor: '#3b82f6' });
    }
}

async function insertarEnlace() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero', confirmButtonColor: '#f59e0b' });
        return;
    }
    const selection = window.getSelection();
    const textoSeleccionado = selection.toString();
    const { value: url } = await Swal.fire({
        title: 'Insertar enlace',
        input: 'url',
        inputLabel: 'URL del enlace',
        inputPlaceholder: 'https://ejemplo.com',
        inputValue: textoSeleccionado.match(/^https?:\/\//) ? textoSeleccionado : '',
        showCancelButton: true,
        confirmButtonText: 'Insertar',
        confirmButtonColor: '#2563eb',
        cancelButtonText: 'Cancelar'
    });
    if (url) {
        contenido.focus();
        if (textoSeleccionado && !textoSeleccionado.match(/^https?:\/\//))
            document.execCommand('createLink', false, url);
        else document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
}

async function insertarTabla() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición primero', confirmButtonColor: '#f59e0b' });
        return;
    }
    contenido.focus();
    
    const selection = window.getSelection();
    let savedRange = null;
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    } else {
        savedRange = document.createRange();
        savedRange.selectNodeContents(contenido);
        savedRange.collapse(false);
    }
    
    const { value: formValues } = await Swal.fire({
        title: 'Insertar tabla',
        html: `<div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
            <div style="text-align: left;"><label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Filas:</label>
            <input id="filas" type="number" min="1" max="30" value="3" style="padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; width: 100px;"></div>
            <div style="text-align: left;"><label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Columnas:</label>
            <input id="columnas" type="number" min="1" max="20" value="3" style="padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; width: 100px;"></div>
        </div>`,
        confirmButtonText: 'Insertar',
        confirmButtonColor: '#2563eb',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const filas = parseInt(document.getElementById('filas').value);
            const columnas = parseInt(document.getElementById('columnas').value);
            if (filas < 1 || columnas < 1 || filas > 30 || columnas > 20) {
                Swal.showValidationMessage('Valores inválidos (1-30 filas, 1-20 columnas)');
                return false;
            }
            return { filas, columnas };
        }
    });
    if (!formValues) return;
    
    contenido.focus();
    selection.removeAllRanges();
    selection.addRange(savedRange);
    
    let tablaHtml = '<table class="tabla-con-bordes" style="border-collapse: collapse; width: 100%;" data-handled="false">';
    for (let i = 0; i < formValues.filas; i++) {
        tablaHtml += '<tr>';
        for (let j = 0; j < formValues.columnas; j++) {
            const tag = (i === 0) ? 'th' : 'td';
            tablaHtml += `<${tag} style="border: 1px solid #e2e8f0; padding: 12px 16px;">`;
            tablaHtml += (i === 0 ? `Encabezado ${j+1}` : '&nbsp;');
            tablaHtml += `</${tag}>`;
        }
        tablaHtml += '</tr>';
    }
    tablaHtml += '</table><br>';
    
    document.execCommand('insertHTML', false, tablaHtml);
    
    const nuevaTabla = contenido.querySelector('table:last-of-type');
    if (nuevaTabla) {
        nuevaTabla.setAttribute('data-handled', 'false');
        añadirManejadoresTabla(nuevaTabla);
    }
}

function limpiarSeleccionCeldas() {
    celdasSeleccionadas.forEach(celda => celda.classList.remove('celda-seleccionada'));
    celdasSeleccionadas.clear();
}
function toggleCeldaSeleccion(celda, isCtrl = false) {
    if (!isCtrl) limpiarSeleccionCeldas();
    if (celdasSeleccionadas.has(celda)) {
        celda.classList.remove('celda-seleccionada');
        celdasSeleccionadas.delete(celda);
    } else {
        celda.classList.add('celda-seleccionada');
        celdasSeleccionadas.add(celda);
    }
}
function habilitarSeleccionCeldas() {
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    if (contenido._cellClickListener) contenido.removeEventListener('click', contenido._cellClickListener);
    const clickHandler = (e) => {
        const celda = e.target.closest('td, th');
        if (!celda || contenido.contentEditable !== 'true') return;
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl) { e.preventDefault(); toggleCeldaSeleccion(celda, true); }
        else { if (!celdasSeleccionadas.has(celda) || celdasSeleccionadas.size !== 1) { limpiarSeleccionCeldas(); celda.classList.add('celda-seleccionada'); celdasSeleccionadas.add(celda); } }
    };
    contenido.addEventListener('click', clickHandler);
    contenido._cellClickListener = clickHandler;
}
function obtenerCeldaSeleccionada() {
    if (celdasSeleccionadas.size === 1) return Array.from(celdasSeleccionadas)[0];
    const selection = window.getSelection();
    if (selection.rangeCount) {
        let node = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const celda = node.closest('td, th');
        if (celda) return celda;
    }
    Swal.fire({ icon: 'info', title: 'Selecciona una celda', text: 'Haz clic en una celda de la tabla', confirmButtonColor: '#3b82f6' });
    return null;
}
function combinarCeldasSeleccionadas() {
    if (celdasSeleccionadas.size < 2) {
        Swal.fire({ icon: 'info', title: 'Selección insuficiente', text: 'Usa Ctrl+clic para seleccionar múltiples celdas', confirmButtonColor: '#3b82f6' });
        return;
    }
    const celdas = Array.from(celdasSeleccionadas).sort((a,b) => {
        if (a.parentElement.rowIndex !== b.parentElement.rowIndex) return a.parentElement.rowIndex - b.parentElement.rowIndex;
        return a.cellIndex - b.cellIndex;
    });
    const primera = celdas[0];
    const filaInicio = primera.parentElement.rowIndex;
    const colInicio = primera.cellIndex;
    let maxFila = filaInicio, maxCol = colInicio;
    celdas.forEach(c => { maxFila = Math.max(maxFila, c.parentElement.rowIndex); maxCol = Math.max(maxCol, c.cellIndex); });
    primera.rowSpan = maxFila - filaInicio + 1;
    primera.colSpan = maxCol - colInicio + 1;
    for (let i = 1; i < celdas.length; i++) if (celdas[i].parentElement) celdas[i].remove();
    limpiarSeleccionCeldas();
}
function eliminarCelda() { const celda = obtenerCeldaSeleccionada(); if (celda) { celda.remove(); limpiarSeleccionCeldas(); } }
function eliminarFila() { const celda = obtenerCeldaSeleccionada(); if (celda) { const fila = celda.parentElement; if (fila && fila.parentElement) fila.remove(); limpiarSeleccionCeldas(); } }
function eliminarColumna() {
    const celda = obtenerCeldaSeleccionada();
    if (!celda) return;
    const table = celda.closest('table');
    const colIndex = celda.cellIndex;
    for (let row of table.rows) if (row.cells[colIndex]) row.cells[colIndex].remove();
    limpiarSeleccionCeldas();
}

function iniciarRedimensionColumna(e, colIndex, table) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = table.rows[0]?.cells[colIndex]?.offsetWidth || 100;
    const onMouseMove = (moveEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(40, startWidth + diff);
        for (let i = 0; i < table.rows.length; i++) if (table.rows[i].cells[colIndex]) table.rows[i].cells[colIndex].style.width = newWidth + 'px';
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
function iniciarRedimensionFila(e, rowIndex, table) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = table.rows[rowIndex]?.offsetHeight || 30;
    const onMouseMove = (moveEvent) => {
        const diff = moveEvent.clientY - startY;
        const newHeight = Math.max(20, startHeight + diff);
        table.rows[rowIndex].style.height = newHeight + 'px';
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = ''; };
    document.body.style.cursor = 'row-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
function añadirManejadoresTabla(table) {
    if (!table || table.getAttribute('data-handled') === 'true') return;
    table.style.tableLayout = 'fixed';
    table.setAttribute('data-handled', 'true');
    if (table.rows.length === 0) return;
    const firstRow = table.rows[0];
    for (let i = 0; i < firstRow.cells.length; i++) {
        const cell = firstRow.cells[i];
        if (cell.querySelector('.resizer')) continue;
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        resizer.title = 'Arrastra para redimensionar columna';
        resizer.addEventListener('mousedown', (e) => iniciarRedimensionColumna(e, i, table));
        cell.style.position = 'relative';
        cell.appendChild(resizer);
    }
    for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        if (row.querySelector('.row-resizer') || row.cells.length === 0) continue;
        const rowResizer = document.createElement('div');
        rowResizer.className = 'row-resizer';
        rowResizer.title = 'Arrastra para redimensionar fila';
        rowResizer.addEventListener('mousedown', (e) => iniciarRedimensionFila(e, r, table));
        const lastCell = row.cells[row.cells.length - 1];
        lastCell.style.position = 'relative';
        lastCell.appendChild(rowResizer);
    }
}

function insertarImagenManual() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            const contenido = obtenerContenidoEditable();
            if (contenido && contenido.contentEditable === 'true') {
                contenido.focus();
                const imgHtml = `<img src="${base64}" class="nueva-imagen" style="max-width:100%; margin:1rem auto; display:block; border-radius:8px;" alt="Imagen insertada">`;
                document.execCommand('insertHTML', false, imgHtml);
                setTimeout(() => { 
                    const nuevaImg = contenido.querySelector('img:last-of-type'); 
                    if (nuevaImg) addDragHandlers(nuevaImg);
                    actualizarBotonZip();
                }, 20);
            } else { Swal.fire({ icon: 'info', title: 'Modo edición requerido', text: 'Activa el modo edición antes de insertar imágenes.', confirmButtonColor: '#3b82f6' }); }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function seleccionarImagen(img) {
    if (imagenSeleccionada) {
        imagenSeleccionada.classList.remove('img-seleccionada');
        eliminarResizers();
    }
    imagenSeleccionada = img;
    img.classList.add('img-seleccionada');
    crearResizers(img);
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(img);
    selection.removeAllRanges();
    selection.addRange(range);
}

function addDragHandlers(img) {
    if (!img || img.hasAttribute('data-draggable')) return;
    img.setAttribute('data-draggable', 'true');
    img.setAttribute('draggable', 'true');
    img.style.cursor = 'grab';
    img.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/html', img.outerHTML); e.dataTransfer.effectAllowed = 'move'; img.style.cursor = 'grabbing'; img.style.opacity = '0.5'; });
    img.addEventListener('dragend', (e) => { img.style.cursor = 'grab'; img.style.opacity = '1'; });
}
function habilitarDragAndDrop() {
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    contenido.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    contenido.addEventListener('drop', (e) => {
        e.preventDefault();
        const html = e.dataTransfer.getData('text/html');
        if (html && html.includes('<img')) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (range) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                const img = temp.querySelector('img');
                if (img) { range.insertNode(img); addDragHandlers(img); contenido.focus(); actualizarBotonZip(); }
            }
        }
    });
    contenido.querySelectorAll('img').forEach(addDragHandlers);
    if (observerImagenes) observerImagenes.disconnect();
    observerImagenes = new MutationObserver((mutations) => {
        mutations.forEach(m => { m.addedNodes.forEach(node => { if (node.nodeType === 1 && node.tagName === 'IMG') addDragHandlers(node); if (node.nodeType === 1 && node.querySelectorAll) node.querySelectorAll('img').forEach(addDragHandlers); actualizarBotonZip(); }); });
    });
    observerImagenes.observe(contenido, { childList: true, subtree: true });
}

function insertarIcono() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición antes de insertar un icono.', confirmButtonColor: '#f59e0b' });
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/x-icon, image/jpeg, image/svg+xml, image/gif';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            contenido.focus();
            const imgHtml = `<img src="${base64}" class="icono-insertado" style="display: inline-block; max-width: 32px; max-height: 32px; width: auto; height: auto; vertical-align: middle; margin: 0 2px;" alt="Icono">`;
            document.execCommand('insertHTML', false, imgHtml);
            const nuevoIcono = contenido.querySelector('img:last-of-type');
            if (nuevoIcono) {
                addDragHandlers(nuevoIcono);
                nuevoIcono.addEventListener('click', (e) => {
                    if (modoEdicion) {
                        e.preventDefault();
                        e.stopPropagation();
                        seleccionarImagen(nuevoIcono);
                    }
                });
            }
            actualizarBotonZip();
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function eliminarIconoCercano() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        Swal.fire({ icon: 'info', title: 'Selecciona un icono', text: 'Coloca el cursor sobre un icono y vuelve a intentar.', confirmButtonColor: '#3b82f6' });
        return;
    }
    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let icono = null;
    if (node.tagName === 'IMG' && node.classList.contains('icono-insertado')) {
        icono = node;
    } else {
        icono = node.querySelector('.icono-insertado');
        if (!icono && node.parentElement) icono = node.parentElement.querySelector('.icono-insertado');
    }
    if (icono) {
        icono.remove();
        Swal.fire({ icon: 'success', title: 'Icono eliminado', timer: 1200, showConfirmButton: false });
        actualizarBotonZip();
    } else {
        Swal.fire({ icon: 'info', title: 'No se encontró icono', text: 'Asegúrate de tener el cursor cerca de un icono o selecciónalo.', confirmButtonColor: '#3b82f6' });
    }
}

function anadirLogo() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición antes de insertar el logo.', confirmButtonColor: '#f59e0b' });
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            contenido.focus();
            const logoHtml = `<img src="${base64}" class="logo-revista" style="display: inline-block; max-width: 120px; margin: 0.5rem auto; vertical-align: middle;" alt="Logotipo">`;
            document.execCommand('insertHTML', false, logoHtml);
            const nuevoLogo = contenido.querySelector('.logo-revista:last-of-type');
            if (nuevoLogo) {
                addDragHandlers(nuevoLogo);
                nuevoLogo.addEventListener('click', (e) => {
                    if (modoEdicion) {
                        e.preventDefault();
                        e.stopPropagation();
                        seleccionarImagen(nuevoLogo);
                    }
                });
            }
            document.getElementById('controlesLogo').style.display = 'flex';
            const logoActual = contenido.querySelector('.logo-revista:last-of-type');
            if (logoActual) {
                document.getElementById('logoTamano').value = parseInt(logoActual.style.maxWidth) || 120;
                document.getElementById('logoOpacidad').value = logoActual.style.opacity || 1;
            }
            actualizarBotonZip();
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function aplicarControlesLogo() {
    const contenido = obtenerContenidoEditable();
    const logo = contenido?.querySelector('.logo-revista');
    if (logo) {
        const tamaño = document.getElementById('logoTamano')?.value;
        const opacidad = document.getElementById('logoOpacidad')?.value;
        if (tamaño) logo.style.maxWidth = tamaño + 'px';
        if (opacidad) logo.style.opacity = opacidad;
    }
}

function manejarPegado(e) {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let imagenEncontrada = false;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                e.preventDefault();
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    contenido.focus();
                    const imgHtml = `<img src="${base64}" class="nueva-imagen" style="max-width:100%; display:block; margin:1rem auto; border-radius:8px;" alt="Imagen pegada">`;
                    document.execCommand('insertHTML', false, imgHtml);
                    const nuevaImg = contenido.querySelector('img:last-of-type');
                    if (nuevaImg) {
                        addDragHandlers(nuevaImg);
                        nuevaImg.addEventListener('click', (e) => {
                            if (modoEdicion) {
                                e.preventDefault();
                                e.stopPropagation();
                                seleccionarImagen(nuevaImg);
                            }
                        });
                    }
                    actualizarBotonZip();
                };
                reader.readAsDataURL(blob);
                imagenEncontrada = true;
                break;
            }
        }
    }

    if (!imagenEncontrada) {
        return;
    }
}

function ocultarAreaCarga(ocultar) {
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) uploadArea.style.display = ocultar ? 'none' : 'block';
}

function aplicarFuenteConSpan(fontFamily) {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        Swal.fire({ icon: 'info', title: 'Sin selección', text: 'Selecciona un texto para cambiar la fuente.', confirmButtonColor: '#3b82f6' });
        return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        span.innerHTML = '\u200B';
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        try {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;
            range.surroundContents(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } catch (e) {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;
            const contenido = range.extractContents();
            span.appendChild(contenido);
            range.insertNode(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
}

function crearResizers(img) {
    eliminarResizers();
    const container = img.parentElement;
    if (container.style.position !== 'relative') container.style.position = 'relative';
    
    const resizerTL = document.createElement('div');
    resizerTL.className = 'resizer-tl';
    resizerTL.style.position = 'absolute';
    resizerTL.style.top = '-5px';
    resizerTL.style.left = '-5px';
    resizerTL.style.width = '10px';
    resizerTL.style.height = '10px';
    resizerTL.style.backgroundColor = '#3b82f6';
    resizerTL.style.borderRadius = '50%';
    resizerTL.style.cursor = 'nw-resize';
    resizerTL.style.zIndex = '1000';
    
    let startX, startY, startWidth, startHeight;
    const startResize = (e, direction) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        
        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;
            if (direction === 'tl') {
                newWidth = Math.max(50, startWidth - dx);
                newHeight = Math.max(50, startHeight - dy);
                img.style.width = newWidth + 'px';
                img.style.height = newHeight + 'px';
            } else if (direction === 'tr') {
                newWidth = Math.max(50, startWidth + dx);
                newHeight = Math.max(50, startHeight - dy);
                img.style.width = newWidth + 'px';
                img.style.height = newHeight + 'px';
            } else if (direction === 'bl') {
                newWidth = Math.max(50, startWidth - dx);
                newHeight = Math.max(50, startHeight + dy);
                img.style.width = newWidth + 'px';
                img.style.height = newHeight + 'px';
            } else if (direction === 'br') {
                newWidth = Math.max(50, startWidth + dx);
                newHeight = Math.max(50, startHeight + dy);
                img.style.width = newWidth + 'px';
                img.style.height = newHeight + 'px';
            }
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    resizerTL.addEventListener('mousedown', (e) => startResize(e, 'tl'));
    container.appendChild(resizerTL);
    
    const resizerTR = resizerTL.cloneNode();
    resizerTR.className = 'resizer-tr';
    resizerTR.style.left = 'auto';
    resizerTR.style.right = '-5px';
    resizerTR.style.cursor = 'ne-resize';
    resizerTR.addEventListener('mousedown', (e) => startResize(e, 'tr'));
    container.appendChild(resizerTR);
    
    const resizerBL = resizerTL.cloneNode();
    resizerBL.className = 'resizer-bl';
    resizerBL.style.top = 'auto';
    resizerBL.style.bottom = '-5px';
    resizerBL.style.cursor = 'sw-resize';
    resizerBL.addEventListener('mousedown', (e) => startResize(e, 'bl'));
    container.appendChild(resizerBL);
    
    const resizerBR = resizerTL.cloneNode();
    resizerBR.className = 'resizer-br';
    resizerBR.style.top = 'auto';
    resizerBR.style.left = 'auto';
    resizerBR.style.bottom = '-5px';
    resizerBR.style.right = '-5px';
    resizerBR.style.cursor = 'se-resize';
    resizerBR.addEventListener('mousedown', (e) => startResize(e, 'br'));
    container.appendChild(resizerBR);
    
    img._resizers = [resizerTL, resizerTR, resizerBL, resizerBR];
}

function eliminarResizers() {
    if (imagenSeleccionada && imagenSeleccionada._resizers) {
        imagenSeleccionada._resizers.forEach(r => r.remove());
        imagenSeleccionada._resizers = [];
    }
}

function habilitarEdicion() {
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    contenido.contentEditable = 'true';
    contenido.style.border = '2px solid #3b82f6';
    contenido.style.padding = '1.5rem';
    contenido.style.backgroundColor = '#fffef7';
    contenido.style.borderRadius = '12px';
    modoEdicion = true;
    ocultarAreaCarga(true);
    document.getElementById('editarBtn').style.display = 'none';
    document.getElementById('guardarEdicionBtn').style.display = 'inline-block';
    document.getElementById('barraHerramientas').style.display = 'flex';
    inicializarPestanasBarra();
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            guardarSeleccion();
            const cmd = btn.getAttribute('data-cmd');
            if (cmd && cmd.startsWith('justify')) {
                if (!aplicarAlineacionImagen(cmd)) aplicarComando(cmd);
            } else if (cmd) {
                aplicarComando(cmd);
            }
            actualizarBotonZip();
        };
    });
    document.getElementById('fuenteSelect').onchange = cambiarFuente;
    const fuenteSelect = document.getElementById('fuenteSelect');
    if (fuenteSelect) {
        fuenteSelect.addEventListener('mousedown', () => { guardarSeleccion(); });
        fuenteSelect.onchange = cambiarFuente;
    }
    document.getElementById('tamanoSelect').onchange = cambiarTamaño;
    const tamanoSelect = document.getElementById('tamanoSelect');
    if (tamanoSelect) {
        tamanoSelect.addEventListener('mousedown', () => { guardarSeleccion(); });
        tamanoSelect.onchange = cambiarTamaño;
    }
    document.getElementById('insertarImagenBtn').onclick = insertarImagenManual;
    document.getElementById('insertarTablaBtn').onclick = insertarTabla;
    document.getElementById('insertarEnlaceBtn').onclick = insertarEnlace;
    document.getElementById('listaLetrasBtn').onclick = aplicarListaLetras;
    document.getElementById('listaRomanosBtn').onclick = aplicarListaRomanos;
    document.getElementById('anadirLogoBtn').onclick = anadirLogo;
    document.getElementById('aplicarLogoBtn').onclick = aplicarControlesLogo;
    document.getElementById('insertarLineaBtn').onclick = insertarLineaDecorativa;
    document.getElementById('eliminarLineaBtn').onclick = eliminarLineaCercana;
    document.getElementById('insertarIconoBtn').onclick = insertarIcono;
    document.getElementById('eliminarIconoBtn').onclick = eliminarIconoCercano;
    document.getElementById('insertarSaltoPaginaBtn').onclick = insertarNuevaPagina;
    document.getElementById('añadirPiePaginaBtn').onclick = añadirPiePagina;
    document.getElementById('combinarSeleccionBtn').onclick = combinarCeldasSeleccionadas;
    document.getElementById('eliminarCeldaBtn').onclick = eliminarCelda;
    document.getElementById('eliminarFilaBtn').onclick = eliminarFila;
    document.getElementById('eliminarColumnaBtn').onclick = eliminarColumna;
    const colorBtn = document.getElementById('colorBtn');
    if (colorBtn) colorBtn.onclick = aplicarColor;
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) colorPicker.onchange = aplicarColor;
    document.getElementById('recuadroBtn').onclick = aplicarRecuadroConModal;
    document.getElementById('quitarRecuadroBtn')?.addEventListener('click', quitarRecuadro);
    document.getElementById('sangriaFrancesaBtn').onclick = aplicarSangriaFrancesa;
    document.getElementById('sangriaNormalBtn').onclick = aplicarSangriaNormal;
    document.getElementById('numerarReferenciasBtn').onclick = numerarReferencias;
    document.getElementById('estiloAPABtn').onclick = aplicarEstiloAPA;
    document.getElementById('deshacerSangriaBtn').onclick = deshacerSangria;
    
    habilitarSeleccionCeldas();
    habilitarDragAndDrop();
    document.querySelectorAll('.tabla-con-bordes').forEach(table => { if (table.getAttribute('data-handled') !== 'true') añadirManejadoresTabla(table); });
    if (observerTablas) observerTablas.disconnect();
    observerTablas = new MutationObserver((mutations) => {
        mutations.forEach(m => { m.addedNodes.forEach(node => { if (node.nodeType === 1 && node.tagName === 'TABLE' && node.getAttribute('data-handled') !== 'true') añadirManejadoresTabla(node); if (node.nodeType === 1 && node.querySelectorAll) node.querySelectorAll('table:not([data-handled])').forEach(tabla => añadirManejadoresTabla(tabla)); }); });
    });
    observerTablas.observe(contenido, { childList: true, subtree: true });
    contenido.addEventListener('keydown', manejarAtajosTeclado);
    contenido.addEventListener('paste', manejarPegado);
    contenido.querySelectorAll('img').forEach(img => { img.addEventListener('click', (e) => { if (modoEdicion) { e.preventDefault(); e.stopPropagation(); seleccionarImagen(img); } }); });
    actualizarSelectores();
    actualizarBotonZip();
}

function manejarAtajosTeclado(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                document.execCommand('bold');
                actualizarSelectores();
                actualizarBotonesActivos();
                break;
            case 'i':
                e.preventDefault();
                document.execCommand('italic');
                actualizarSelectores();
                actualizarBotonesActivos();
                break;
            case 'u':
                e.preventDefault();
                document.execCommand('underline');
                actualizarSelectores();
                actualizarBotonesActivos();
                break;
            case 's':
                if (e.shiftKey) {
                    e.preventDefault();
                    document.execCommand('strikeThrough');
                    actualizarSelectores();
                    actualizarBotonesActivos();
                }
                break;
            case 'z':
                e.preventDefault();
                document.execCommand('undo');
                break;
            case 'y':
                e.preventDefault();
                document.execCommand('redo');
                break;
            case 'k':
                e.preventDefault();
                insertarEnlace();
                break;
        }
    }
}

function obtenerReferenciasSeleccionadas() {
    const selection = window.getSelection();
    let referencias = [];

    if (selection.rangeCount && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const contenido = obtenerContenidoEditable();
        if (!contenido) return [];
        
        const todosLosParrafos = contenido.querySelectorAll('p, div.referencia, .referencia');
        for (let p of todosLosParrafos) {
            if (range.intersectsNode(p)) {
                referencias.push(p);
            }
        }
        if (referencias.length === 0) {
            let node = range.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            let bloque = node.closest('p, div');
            if (bloque) referencias.push(bloque);
        }
    } else {
        referencias = Array.from(document.querySelectorAll('.contenido-convertido .referencia, .contenido-convertido p'));
    }

    if (referencias.length === 0) {
        Swal.fire('No hay referencias', 'Selecciona el texto que deseas formatear como referencia o asegúrate de que el documento contenga párrafos con el formato [1] o 1. al inicio.', 'info');
        return [];
    }

    return referencias;
}

function aplicarSangriaFrancesa() {
    const referencias = obtenerReferenciasSeleccionadas();
    if (referencias.length === 0) {
        Swal.fire('No hay referencias', 'Selecciona o convierte un documento con referencias.', 'info');
        return;
    }
    referencias.forEach(p => {
        p.style.paddingLeft = '2em';
        p.style.textIndent = '-2em';
        p.style.marginLeft = '0';
    });
}

function aplicarSangriaNormal() {
    const referencias = obtenerReferenciasSeleccionadas();
    if (referencias.length === 0) {
        Swal.fire('No hay referencias', 'Selecciona o convierte un documento con referencias.', 'info');
        return;
    }
    referencias.forEach(p => {
        p.style.textIndent = '2em';
        p.style.paddingLeft = '0';
        p.style.marginLeft = '0';
    });
}

function numerarReferencias() {
    const referencias = obtenerReferenciasSeleccionadas();
    if (referencias.length === 0) {
        Swal.fire('No hay referencias', 'Selecciona o convierte un documento con referencias.', 'info');
        return;
    }
    referencias.forEach((p, idx) => {
        let texto = p.innerHTML;
        texto = texto.replace(/^\s*(\[\d+\]|\d+\.)\s*/, '');
        p.innerHTML = `${idx+1}. ${texto}`;
    });
}

function aplicarEstiloAPA() {
    const referencias = obtenerReferenciasSeleccionadas();
    if (referencias.length === 0) {
        Swal.fire('No hay referencias', 'Selecciona o convierte un documento con referencias.', 'info');
        return;
    }
    referencias.forEach(p => {
        p.style.fontFamily = 'Times New Roman, serif';
        p.style.fontSize = '12pt';
        p.style.lineHeight = '2';
        p.style.marginBottom = '0.5em';
        p.style.paddingLeft = '2em';
        p.style.textIndent = '-2em';
    });
}

function guardarEdicion() {
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    contenido.contentEditable = 'false';
    contenido.style.border = 'none';
    contenido.style.padding = '';
    contenido.style.backgroundColor = '';
    contenido.style.borderRadius = '';
    modoEdicion = false;
    if (imagenSeleccionada) { imagenSeleccionada.classList.remove('img-seleccionada'); imagenSeleccionada = null; }
    limpiarSeleccionCeldas();
    ocultarAreaCarga(false);
    document.getElementById('editarBtn').style.display = 'inline-block';
    document.getElementById('guardarEdicionBtn').style.display = 'none';
    document.getElementById('barraHerramientas').style.display = 'none';
    const controlesLogo = document.getElementById('controlesLogo');
    if (controlesLogo) controlesLogo.style.display = 'none';
    htmlActual = contenido.innerHTML;
    if (observerTablas) observerTablas.disconnect();
    observerTablas = null;
    contenido.removeEventListener('keydown', manejarAtajosTeclado);
    contenido.removeEventListener('paste', manejarPegado);
    actualizarBotonZip();
    Swal.fire({ icon: 'success', title: 'Cambios guardados', text: 'El documento se ha actualizado.', confirmButtonColor: '#059669', timer: 2000, showConfirmButton: false });
}

function inicializarPestanasBarra() {
    const tabs = document.querySelectorAll('.tab-btn-toolbar');
    const contents = document.querySelectorAll('.tab-content-toolbar');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.remove('active'));
            const contenidoActivo = document.getElementById(`tab-${target}`);
            if (contenidoActivo) contenidoActivo.classList.add('active');
        });
    });
}

async function insertarLineaDecorativa() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición antes de insertar una línea.', confirmButtonColor: '#f59e0b' });
        return;
    }
    contenido.focus();

    let color = '#3b82f6';
    let grosor = 2;
    let estilo = 'solid';
    let ancho = 100;
    let margenVertical = 1.5;

    const { value: formValues } = await Swal.fire({
        title: 'Personalizar línea decorativa',
        html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; justify-content: space-between;">
                    <span>Color:</span>
                    <input type="color" id="linea-color" value="${color}">
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Grosor (px):</span>
                    <input type="range" id="linea-grosor" min="1" max="12" value="${grosor}">
                    <span id="grosor-valor">${grosor}px</span>
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Estilo:</span>
                    <select id="linea-estilo">
                        <option value="solid">Sólida</option>
                        <option value="dashed">Discontinua (---)</option>
                        <option value="dotted">Punteada (...)</option>
                        <option value="double">Doble</option>
                        <option value="groove">Grabada</option>
                        <option value="ridge">Relieve</option>
                    </select>
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Ancho (%):</span>
                    <input type="range" id="linea-ancho" min="30" max="100" step="5" value="${ancho}">
                    <span id="ancho-valor">${ancho}%</span>
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Margen vertical (rem):</span>
                    <input type="range" id="linea-margen" min="0" max="3" step="0.25" value="${margenVertical}">
                    <span id="margen-valor">${margenVertical}rem</span>
                </label>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Insertar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6c757d',
        didOpen: () => {
            const grosorSlider = document.getElementById('linea-grosor');
            const anchoSlider = document.getElementById('linea-ancho');
            const margenSlider = document.getElementById('linea-margen');
            const grosorVal = document.getElementById('grosor-valor');
            const anchoVal = document.getElementById('ancho-valor');
            const margenVal = document.getElementById('margen-valor');
            const estiloSelect = document.getElementById('linea-estilo');
    
            function actualizarGrosorMinimo() {
                const estilo = estiloSelect.value;
                const grosorActual = parseInt(grosorSlider.value);
                let minimo = 1;
                if (estilo === 'double' || estilo === 'groove' || estilo === 'ridge') {
                    minimo = 3;
                }
                grosorSlider.min = minimo;
                if (grosorActual < minimo) {
                    grosorSlider.value = minimo;
                    grosorVal.innerText = minimo + 'px';
                }
            }
    
            grosorSlider.oninput = () => grosorVal.innerText = grosorSlider.value + 'px';
            anchoSlider.oninput = () => anchoVal.innerText = anchoSlider.value + '%';
            margenSlider.oninput = () => margenVal.innerText = margenSlider.value + 'rem';
            estiloSelect.onchange = () => actualizarGrosorMinimo();
            actualizarGrosorMinimo();
        },
        preConfirm: () => {
            const estilo = document.getElementById('linea-estilo').value;
            let grosor = parseInt(document.getElementById('linea-grosor').value);
            if ((estilo === 'double' || estilo === 'groove' || estilo === 'ridge') && grosor < 3) {
                grosor = 3;
            }
            return {
                color: document.getElementById('linea-color').value,
                grosor: grosor,
                estilo: estilo,
                ancho: parseInt(document.getElementById('linea-ancho').value),
                margen: parseFloat(document.getElementById('linea-margen').value)
            };
        }
    });

    if (!formValues) return;

    const borderRadius = (formValues.estilo === 'solid') ? `border-radius: ${formValues.grosor}px;` : '';
    const lineaHtml = `<hr class="linea-decorativa" style="
        display: block;
        width: ${formValues.ancho}%;
        margin: ${formValues.margen}rem auto;
        border: none;
        border-top: ${formValues.grosor}px ${formValues.estilo} ${formValues.color};
        ${borderRadius}
    ">`;
    
    document.execCommand('insertHTML', false, lineaHtml);
    Swal.fire({ icon: 'success', title: 'Línea insertada', timer: 1200, showConfirmButton: false });
}

function eliminarLineaCercana() {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') {
        Swal.fire({ icon: 'warning', title: 'Modo edición requerido', text: 'Activa el modo edición antes de eliminar una línea.', confirmButtonColor: '#f59e0b' });
        return;
    }
    
    const selection = window.getSelection();
    let elementoAEliminar = null;
    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        elementoAEliminar = node.closest('.linea-decorativa');
        if (!elementoAEliminar && node.tagName === 'HR' && node.classList.contains('linea-decorativa')) {
            elementoAEliminar = node;
        }
    }
    
    if (!elementoAEliminar && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top + (rect.height / 2);
        const elementosEnPosicion = document.elementsFromPoint(x, y);
        for (let el of elementosEnPosicion) {
            if (el.classList && el.classList.contains('linea-decorativa')) {
                elementoAEliminar = el;
                break;
            }
        }
    }
    
    if (!elementoAEliminar) {
        const primeraLinea = contenido.querySelector('.linea-decorativa');
        if (primeraLinea) {
            Swal.fire({
                title: '¿Eliminar la primera línea del documento?',
                text: 'No se encontró ninguna línea cerca del cursor. ¿Deseas eliminar la primera línea encontrada?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(result => {
                if (result.isConfirmed) {
                    primeraLinea.remove();
                    Swal.fire({ icon: 'success', title: 'Línea eliminada', timer: 1200, showConfirmButton: false });
                }
            });
            return;
        } else {
            Swal.fire({ icon: 'info', title: 'No hay líneas', text: 'No se encontró ninguna línea decorativa en el documento.', confirmButtonColor: '#3b82f6' });
            return;
        }
    }
    
    elementoAEliminar.remove();
    Swal.fire({ icon: 'success', title: 'Línea eliminada', timer: 1200, showConfirmButton: false });
}

function cargarHtmlDesdeArchivo() {
    const input = document.getElementById('inputHtml');
    if (input) input.click();
}

function procesarArchivoHtml(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.html')) {
        Swal.fire({ icon: 'error', title: 'Formato incorrecto', text: 'Selecciona un archivo .html', confirmButtonColor: '#ef4444' });
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const contenidoHtmlCompleto = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(contenidoHtmlCompleto, 'text/html');
        
        let contenidoExtraido = null;
        const paginas = doc.querySelectorAll('.pagina');
        if (paginas.length > 0) {
            paginas.forEach(pagina => {
                const headerExistente = pagina.querySelector('.header-integrado');
                const footerExistente = pagina.querySelector('.footer-integrado');
                if (headerExistente) headerExistente.remove();
                if (footerExistente) footerExistente.remove();
            });
            contenidoExtraido = Array.from(paginas).map(p => p.outerHTML).join('');
        } else {
            const bodyClone = doc.body.cloneNode(true);
            bodyClone.querySelectorAll('.documento-header, .documento-footer, .header-integrado, .footer-integrado').forEach(el => el.remove());
            contenidoExtraido = bodyClone.innerHTML;
        }
        
        if (!contenidoExtraido) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo extraer el contenido del HTML.', confirmButtonColor: '#ef4444' });
            return;
        }
        
        const htmlEstructurado = estructurarContenido(contenidoExtraido);
        
        const vistaDiv = document.getElementById('vistaPrevia');
        if (vistaDiv) {
            vistaDiv.innerHTML = `<div class="contenido-convertido">${htmlEstructurado}</div>`;
            htmlActual = htmlEstructurado;
            ocultarAreaCarga(true);
            document.getElementById('resultado').style.display = 'block';
            habilitarEdicion();
            actualizarBotonZip();
        }
        event.target.value = '';
    };
    reader.onerror = function() {
        Swal.fire({ icon: 'error', title: 'Error de lectura', text: 'No se pudo leer el archivo.', confirmButtonColor: '#ef4444' });
    };
    reader.readAsText(file);
}

async function aplicarRecuadroConModal() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
        Swal.fire({ icon: 'warning', title: 'Selecciona texto', text: 'Debes seleccionar al menos una palabra o bloque.', confirmButtonColor: '#f59e0b' });
        return;
    }
    let bgColor = '#f8fafc';
    let borderColor = '#3b82f6';
    let borderWidth = 2;
    let borderRadius = 12;
    const { value: formValues } = await Swal.fire({
        title: 'Personalizar recuadro',
        html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 12px;">
                <label style="display: flex; justify-content: space-between;">
                    <span>Fondo:</span>
                    <input type="color" id="swal-bg" value="${bgColor}" style="width: 50px;">
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Fondo transparente</span>
                    <input type="checkbox" id="swal-transparent" style="width: auto;">
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Borde:</span>
                    <input type="color" id="swal-border" value="${borderColor}" style="width: 50px;">
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Grosor (px):</span>
                    <input type="range" id="swal-width" min="1" max="8" value="${borderWidth}">
                    <span id="width-val">${borderWidth}px</span>
                </label>
                <label style="display: flex; justify-content: space-between;">
                    <span>Radio (px):</span>
                    <input type="range" id="swal-radius" min="0" max="30" value="${borderRadius}">
                    <span id="radius-val">${borderRadius}px</span>
                </label>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Aplicar recuadro',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6c757d',
        didOpen: () => {
            const widthSlider = document.getElementById('swal-width');
            const radiusSlider = document.getElementById('swal-radius');
            const widthVal = document.getElementById('width-val');
            const radiusVal = document.getElementById('radius-val');
            const transparentCheck = document.getElementById('swal-transparent');
            const bgColorInput = document.getElementById('swal-bg');
            widthSlider.oninput = () => { widthVal.innerText = widthSlider.value + 'px'; };
            radiusSlider.oninput = () => { radiusVal.innerText = radiusSlider.value + 'px'; };
            transparentCheck.onchange = () => {
                bgColorInput.disabled = transparentCheck.checked;
                bgColorInput.style.opacity = transparentCheck.checked ? '0.5' : '1';
            };
        },
        preConfirm: () => {
            const transparent = document.getElementById('swal-transparent').checked;
            return {
                bg: transparent ? 'transparent' : document.getElementById('swal-bg').value,
                borderColor: document.getElementById('swal-border').value,
                borderWidth: parseInt(document.getElementById('swal-width').value),
                borderRadius: parseInt(document.getElementById('swal-radius').value),
                transparent: transparent
            };
        }
    });
    if (!formValues) return;
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    let container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : commonAncestor;
    const isMultiBlock = container.closest('p, h1, h2, h3, h4, div, section, article') ? false : true;
    const wrapper = document.createElement(isMultiBlock ? 'div' : 'span');
    wrapper.style.display = 'inline-block';
    wrapper.style.backgroundColor = formValues.bg;
    wrapper.style.border = `${formValues.borderWidth}px solid ${formValues.borderColor}`;
    wrapper.style.borderRadius = formValues.borderRadius + 'px';
    wrapper.style.padding = '6px 12px';
    wrapper.style.lineHeight = '1.5';
    try {
        range.surroundContents(wrapper);
    } catch (e) {
        const contenido = range.extractContents();
        wrapper.appendChild(contenido);
        range.insertNode(wrapper);
    }
    selection.removeAllRanges();
    Swal.fire({ icon: 'success', title: 'Recuadro aplicado', timer: 1200, showConfirmButton: false });
}

function quitarRecuadro() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const wrapper = node.closest('span, div');
    if (wrapper && (wrapper.style.backgroundColor || wrapper.style.border)) {
        const parent = wrapper.parentNode;
        while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
        parent.removeChild(wrapper);
        selection.removeAllRanges();
        Swal.fire({ icon: 'success', title: 'Recuadro eliminado', timer: 1200, showConfirmButton: false });
    } else {
        Swal.fire({ icon: 'info', title: 'No hay recuadro', text: 'Selecciona un texto que ya tenga recuadro.', confirmButtonColor: '#3b82f6' });
    }
}

function abrirManual() {
    window.open('manual.html', '_blank');
}

// ============================================================
// EVENTO PRINCIPAL
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    configurarDescarga();

    const convertirBtn = document.getElementById('convertirBtn');
    const fileInput = document.getElementById('inputWord');
    const resultadoDiv = document.getElementById('resultado');
    initDragAndDrop();
    const selectBtn = document.getElementById('seleccionarArchivoBtn');
    const fileNameSpan = document.getElementById('nombreArchivoSeleccionado');
    if (selectBtn && fileInput && fileNameSpan) {
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length > 0) {
                fileNameSpan.textContent = fileInput.files[0].name;
            } else {
                fileNameSpan.textContent = 'Ningún archivo seleccionado';
            }
        });
    }

    const editarHtmlBtn = document.getElementById('editarHtmlBtn');
    const inputHtml = document.getElementById('inputHtml');
    if (editarHtmlBtn && inputHtml) {
        editarHtmlBtn.addEventListener('click', cargarHtmlDesdeArchivo);
        inputHtml.addEventListener('change', procesarArchivoHtml);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'F1') {
            e.preventDefault();
            abrirManual();
        }
    });

    document.getElementById('editarBtn').addEventListener('click', habilitarEdicion);
    document.getElementById('guardarEdicionBtn').addEventListener('click', guardarEdicion);

    convertirBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            Swal.fire({ icon: 'warning', title: 'Sin archivo', text: 'Selecciona un archivo .docx', confirmButtonColor: '#f59e0b' });
            return;
        }
        const archivo = fileInput.files[0];
        if (!/\.docx$/i.test(archivo.name)) {
            Swal.fire({ icon: 'error', title: 'Formato incorrecto', text: 'El archivo debe ser .docx', confirmButtonColor: '#ef4444' });
            return;
        }
        const nombreInput = document.getElementById('nombreArchivo');
        if (nombreInput) nombreInput.value = archivo.name.replace(/\.docx$/i, '');

        convertirBtn.disabled = true;
        convertirBtn.innerHTML = '<span class="btn-icon">⏳</span> Convirtiendo...';
        const reader = new FileReader();
        reader.onload = function(e) {
            mammoth.convertToHtml({ arrayBuffer: e.target.result }, {
                convertImage: crearConvertidorImagenes(),
                styleMap: ["p[style-name='Heading 1'] => h1", "p[style-name='Heading 2'] => h2"]
            }).then(result => {
                let htmlMejorado = mejorarEstructuraHTML(result.value);
                htmlActual = htmlMejorado;
                const vistaDiv = document.getElementById('vistaPrevia');
                vistaDiv.innerHTML = `<div class="contenido-convertido">${htmlMejorado}</div>`;
                resultadoDiv.style.display = 'block';
                resultadoDiv.scrollIntoView({ behavior: 'smooth' });
                actualizarBotonZip();

                convertirBtn.disabled = false;
                convertirBtn.innerHTML = '<span class="btn-icon">⚡</span> Convertir a HTML';
            }).catch(err => {
                console.error(err);
                Swal.fire({ icon: 'error', title: 'Error en conversión', text: err.message, confirmButtonColor: '#ef4444' });
                convertirBtn.disabled = false;
                convertirBtn.innerHTML = '<span class="btn-icon">⚡</span> Convertir a HTML';
            });
        };
        reader.readAsArrayBuffer(archivo);
    });
});