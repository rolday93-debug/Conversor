// ============================================================
// CONVERSOR WORD A HTML - VERSIÓN LIMPIA (SIN ESTILOS FIJOS)
// ============================================================

let modoEdicion = false;
let htmlActual = '';
let celdasSeleccionadas = new Set();
let observerTablas = null;
let observerImagenes = null;
let imagenSeleccionada = null;
let savedSelection = null;

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
// LIMPIEZA DE NEGRITAS Y ESTILOS FIJOS EN RESUMEN (opcional)
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

// ============================================================
// ELIMINAR ESTILOS FORZADOS EN SECCIONES (MÉTODOS, RESULTADOS...)
// ============================================================
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

// ============================================================
// AGRUPAR AUTORES Y AFILIACIONES EN RECUADROS ÚNICOS
// ============================================================
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

// ============================================================
// ASIGNAR CLASE .resumen-contenido A LOS PÁRRAFOS DEL RESUMEN
// ============================================================
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

// ============================================================
// MEJORA ESTRUCTURAL DEL HTML
// ============================================================
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
    return htmlResultado;
}

// ============================================================
// GENERAR DOCUMENTO HTML COMPLETO PARA EXPORTAR (sin estilos fijos)
// ============================================================
function generarDocumentoCompleto(contenidoMejorado, tituloPersonalizado) {
    const cssExportado = `        /* Reset y base */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f5f5f5; margin: 20px; padding: 0; font-family: 'Crimson Text', Georgia, serif; line-height: 1.6; color: #1e293b; }
        .documento-exportado { max-width: 1100px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        
        /* Header tipo "filo elegante" */
        .documento-header {
            background: white;
            padding: 0.4rem 2rem;
            border-bottom: 2px solid;
            border-image: linear-gradient(90deg, #1e3a8a, #60a5fa, #1e3a8a) 1;
            border-image-slice: 1;
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
        .documento-contenido { padding: 2rem 2.5rem; }
        .documento-footer { background: #f8fafc; padding: 1rem 2rem; text-align: center; font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; }
        
        /* Sangría para listas */
        .documento-contenido ul,
        .documento-contenido ol {
            margin: 0.75em 0;
            padding-left: 2em;
        }
        .documento-contenido li {
            margin-bottom: 0.25em;
            line-height: 1.6;
        }
        
        /* Tablas */
        .tabla-con-bordes { border-collapse: collapse; width: 100%; margin: 1.5em 0; border: 1px solid #e2e8f0; }
        .tabla-con-bordes th, .tabla-con-bordes td { border: 1px solid #e2e8f0; padding: 8px 12px; vertical-align: top; }
        .tabla-con-bordes th { background-color: #f8fafc; font-weight: 600; }
        .documento-contenido img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin: 1rem auto; display: block; }
        
        /* Márgenes para secciones */
        .tipo-articulo { margin: 0.5em 0 0.5em 0; }
        h1, .documento-titulo { margin: 1em 0 0.5em 0; }
        .autor, .grupo-autores { margin: 0.5em 0; }
        .afiliacion, .grupo-afiliaciones { margin: 0.5em 0; }
        .resumen-titulo { margin: 1em 0 0.5em 0; }
        .seccion-titulo { margin: 1.5em 0 1em 0; }`;
        
    const escapeHTML = (str) => str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
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
    <div class="documento-exportado">
        <header class="documento-header">
            <h1 class="documento-titulo">📄 ${escapeHTML(tituloPersonalizado)}</h1>
        </header>
        <main class="documento-contenido">
            ${contenidoMejorado}
        </main>
        <footer class="documento-footer">
            <p>Documento generado con Conversor Word a HTML</p>
        </footer>
    </div>
</body>
</html>`;
}
// ============================================================
// EDITOR - FUNCIONES DE FORMATO (CON APLICACIÓN POR BLOQUES)
// ============================================================
function obtenerContenidoEditable() {
    const vistaDiv = document.getElementById('vistaPrevia');
    return vistaDiv?.querySelector('.contenido-convertido');
}

// Mapeo de valores del select a píxeles
const SIZE_MAP = {'1':'10px','2':'13px','3':'16px','4':'18px','5':'24px','6':'32px','7':'48px'};

// Mostrar tamaño actual en píxeles (dentro del select o en un span)
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
    const fontFamily = computedStyle.fontFamily;
    const fontSizePx = computedStyle.fontSize; // ej: "16px"
    const fuenteSelect = document.getElementById('fuenteSelect');
    if (fuenteSelect) {
        const fuentes = Array.from(fuenteSelect.options).map(o => o.value.toLowerCase());
        const currentFont = fontFamily.replace(/["']/g, '').toLowerCase();
        let matchIndex = -1;
        fuentes.forEach((f, idx) => { if (currentFont.includes(f) || f.includes(currentFont.split(',')[0]?.trim())) matchIndex = idx; });
        if (matchIndex >= 0) fuenteSelect.selectedIndex = matchIndex;
    }
    // Mostrar el tamaño actual en el select (si existe una opción cercana) o mostrar el valor en un tooltip
    const tamanoSelect = document.getElementById('tamanoSelect');
    if (tamanoSelect && fontSizePx) {
        const px = parseInt(fontSizePx);
        let bestMatch = '3'; // default 16px
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
            if (['bold', 'italic', 'underline', 'strikeThrough'].includes(cmd)) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });
    } catch(e) {}
}

document.addEventListener('selectionchange', () => { if (modoEdicion) actualizarSelectores(); });

// Obtener todos los bloques (p, h1, h2, h3, h4, div, li, td, th) dentro del rango de selección
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

// Aplicar tamaño de fuente a todos los bloques seleccionados
function aplicarTamañoABloques(sizePx) {
    const bloques = obtenerBloquesSeleccionados();
    if (bloques.size > 0) {
        bloques.forEach(bloque => {
            bloque.style.fontSize = sizePx;
        });
    } else {
        // fallback: aplicar a la selección directa
        document.execCommand('fontSize', false, '3'); // no es fiable, pero mejor que nada
    }
}

// Aplicar alineación a todos los bloques seleccionados
function aplicarAlineacionTexto(align) {
    const bloques = obtenerBloquesSeleccionados();
    if (bloques.size > 0) {
        bloques.forEach(bloque => {
            bloque.style.textAlign = align;
        });
    } else {
        document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`, false, null);
    }
}

function aplicarComando(cmd, valor = null) {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') return;
    contenido.focus();
    if (cmd === 'fontName') {
        document.execCommand('fontName', false, valor);
    } else if (cmd === 'fontSize') {
        const sizePx = SIZE_MAP[valor] || '16px';
        aplicarTamañoABloques(sizePx);
    } else if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight' || cmd === 'justifyFull') {
        let align = cmd.replace('justify', '').toLowerCase();
        if (align === 'full') align = 'justify';
        aplicarAlineacionTexto(align);
    } else if (cmd === 'undo') {
        document.execCommand('undo');
    } else if (cmd === 'redo') {
        document.execCommand('redo');
    } else {
        document.execCommand(cmd, false, valor);
    }
    setTimeout(() => { actualizarSelectores(); actualizarBotonesActivos(); }, 10);
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

function cambiarFuente() { const select = document.getElementById('fuenteSelect'); if (select) aplicarComando('fontName', select.value); }
function cambiarTamaño() { const select = document.getElementById('tamanoSelect'); if (select) aplicarComando('fontSize', select.value); }

// ============================================================
// PALETA DE COLORES
// ============================================================
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

// ============================================================
// ENLACES
// ============================================================
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

// ============================================================
// TABLAS - SIN SCROLL
// ============================================================
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
        // NO se hace scroll
    }
}

// ============================================================
// SELECCIÓN MÚLTIPLE DE CELDAS (sin cambios)
// ============================================================
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

// ============================================================
// REDIMENSIONAMIENTO DE TABLAS
// ============================================================
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

// ============================================================
// IMÁGENES (sin cambios relevantes)
// ============================================================
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
                setTimeout(() => { const nuevaImg = contenido.querySelector('img:last-of-type'); if (nuevaImg) addDragHandlers(nuevaImg); }, 20);
            } else { Swal.fire({ icon: 'info', title: 'Modo edición requerido', text: 'Activa el modo edición antes de insertar imágenes.', confirmButtonColor: '#3b82f6' }); }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}
function seleccionarImagen(img) {
    if (imagenSeleccionada) imagenSeleccionada.classList.remove('img-seleccionada');
    imagenSeleccionada = img;
    img.classList.add('img-seleccionada');
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
                if (img) { range.insertNode(img); addDragHandlers(img); contenido.focus(); }
            }
        }
    });
    contenido.querySelectorAll('img').forEach(addDragHandlers);
    if (observerImagenes) observerImagenes.disconnect();
    observerImagenes = new MutationObserver((mutations) => {
        mutations.forEach(m => { m.addedNodes.forEach(node => { if (node.nodeType === 1 && node.tagName === 'IMG') addDragHandlers(node); if (node.nodeType === 1 && node.querySelectorAll) node.querySelectorAll('img').forEach(addDragHandlers); }); });
    });
    observerImagenes.observe(contenido, { childList: true, subtree: true });
}

// ============================================================
// LOGOTIPO
// ============================================================
function anadirLogo() {
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
                let logoExistente = contenido.querySelector('.logo-revista');
                if (logoExistente) logoExistente.src = base64;
                else {
                    const logoImg = document.createElement('img');
                    logoImg.src = base64;
                    logoImg.className = 'logo-revista';
                    logoImg.style.display = 'block';
                    logoImg.style.margin = '10px auto';
                    logoImg.style.maxWidth = '80px';
                    logoImg.style.opacity = '1';
                    contenido.insertBefore(logoImg, contenido.firstChild);
                }
                const controlesLogo = document.getElementById('controlesLogo');
                if (controlesLogo) controlesLogo.style.display = 'flex';
                const logoActual = contenido.querySelector('.logo-revista');
                if (logoActual) {
                    const tamanoInput = document.getElementById('logoTamano');
                    const opacidadInput = document.getElementById('logoOpacidad');
                    if (tamanoInput) tamanoInput.value = parseInt(logoActual.style.maxWidth) || 80;
                    if (opacidadInput) opacidadInput.value = logoActual.style.opacity || 1;
                }
            } else { Swal.fire({ icon: 'warning', title: 'Modo edición', text: 'Activa el modo edición antes de añadir el logo', confirmButtonColor: '#f59e0b' }); }
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

// ============================================================
// OCULTAR ÁREA DE CARGA
// ============================================================
function ocultarAreaCarga(ocultar) {
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) uploadArea.style.display = ocultar ? 'none' : 'block';
}

// ============================================================
// HABILITAR EDICIÓN (conecta todos los eventos)
// ============================================================
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
            const cmd = btn.getAttribute('data-cmd');
            if (cmd && cmd.startsWith('justify')) { if (!aplicarAlineacionImagen(cmd)) aplicarComando(cmd); }
            else if (cmd) aplicarComando(cmd);
        };
    });
    document.getElementById('fuenteSelect').onchange = cambiarFuente;
    document.getElementById('tamanoSelect').onchange = cambiarTamaño;
    document.getElementById('insertarImagenBtn').onclick = insertarImagenManual;
    document.getElementById('insertarTablaBtn').onclick = insertarTabla;
    document.getElementById('insertarEnlaceBtn').onclick = insertarEnlace;
    document.getElementById('anadirLogoBtn').onclick = anadirLogo;
    document.getElementById('aplicarLogoBtn').onclick = aplicarControlesLogo;
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
    
    habilitarSeleccionCeldas();
    habilitarDragAndDrop();
    document.querySelectorAll('.tabla-con-bordes').forEach(table => { if (table.getAttribute('data-handled') !== 'true') añadirManejadoresTabla(table); });
    if (observerTablas) observerTablas.disconnect();
    observerTablas = new MutationObserver((mutations) => {
        mutations.forEach(m => { m.addedNodes.forEach(node => { if (node.nodeType === 1 && node.tagName === 'TABLE' && node.getAttribute('data-handled') !== 'true') añadirManejadoresTabla(node); if (node.nodeType === 1 && node.querySelectorAll) node.querySelectorAll('table:not([data-handled])').forEach(tabla => añadirManejadoresTabla(tabla)); }); });
    });
    observerTablas.observe(contenido, { childList: true, subtree: true });
    contenido.addEventListener('keydown', manejarAtajosTeclado);
    contenido.querySelectorAll('img').forEach(img => { img.addEventListener('click', (e) => { if (modoEdicion) { e.preventDefault(); e.stopPropagation(); seleccionarImagen(img); } }); });
    actualizarSelectores();
}
function manejarAtajosTeclado(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b': e.preventDefault(); aplicarComando('bold'); break;
            case 'i': e.preventDefault(); aplicarComando('italic'); break;
            case 'u': e.preventDefault(); aplicarComando('underline'); break;
            case 'z': e.preventDefault(); aplicarComando('undo'); break;
            case 'y': e.preventDefault(); aplicarComando('redo'); break;
            case 'k': e.preventDefault(); insertarEnlace(); break;
        }
    }
}
// Obtener los párrafos de referencias seleccionados o todos los que tengan clase .referencia
function obtenerReferenciasSeleccionadas() {
    const selection = window.getSelection();
    let referencias = [];

    // 1. Si hay selección de texto, obtener los párrafos (o elementos de bloque) completos que están total o parcialmente dentro del rango
    if (selection.rangeCount && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const contenido = obtenerContenidoEditable();
        if (!contenido) return [];
        
        // Obtener todos los párrafos del documento
        const todosLosParrafos = contenido.querySelectorAll('p, div.referencia, .referencia');
        for (let p of todosLosParrafos) {
            if (range.intersectsNode(p)) {
                referencias.push(p);
            }
        }
        if (referencias.length === 0) {
            // Si no se encontró ningún párrafo, intentar con el elemento más cercano
            let node = range.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            let bloque = node.closest('p, div');
            if (bloque) referencias.push(bloque);
        }
    } else {
        // 2. Sin selección: buscar elementos con clase .referencia
        referencias = Array.from(document.querySelectorAll('.contenido-convertido .referencia, .contenido-convertido p'));
    }

    // Si aún no hay referencias, mostrar mensaje y devolver vacío
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
        // Eliminar numeración existente al principio (si la hay)
        texto = texto.replace(/^\s*(\[\d+\]|\d+\.)\s*/, '');
        // Insertar nueva numeración
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
// ============================================================
// EVENTO PRINCIPAL
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const convertirBtn = document.getElementById('convertirBtn');
    const fileInput = document.getElementById('inputWord');
    const resultadoDiv = document.getElementById('resultado');
    document.getElementById('editarBtn').addEventListener('click', habilitarEdicion);
    document.getElementById('guardarEdicionBtn').addEventListener('click', guardarEdicion);
    convertirBtn.addEventListener('click', function() {
        if (!fileInput.files.length) { Swal.fire({ icon: 'warning', title: 'Sin archivo', text: 'Selecciona un archivo .docx', confirmButtonColor: '#f59e0b' }); return; }
        const archivo = fileInput.files[0];
        if (!/\.docx$/i.test(archivo.name)) { Swal.fire({ icon: 'error', title: 'Formato incorrecto', text: 'El archivo debe ser .docx', confirmButtonColor: '#ef4444' }); return; }
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
                document.getElementById('descargarBtn').onclick = async () => {
                    if (modoEdicion) {
                        const result = await Swal.fire({ title: '¿Guardar cambios?', text: 'Estás en modo edición. ¿Guardar antes de descargar?', icon: 'question', showCancelButton: true, confirmButtonColor: '#059669', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, guardar', cancelButtonText: 'No, descargar sin guardar' });
                        if (result.isConfirmed) guardarEdicion();
                    }
                    const finalHtml = obtenerContenidoEditable()?.innerHTML || htmlActual;
                    let nombreArchivoSalida = document.getElementById('nombreArchivo').value.trim();
                    if (nombreArchivoSalida === '') nombreArchivoSalida = archivo.name.replace(/\.docx$/i, '');
                    const blob = new Blob([generarDocumentoCompleto(finalHtml, nombreArchivoSalida)], { type: 'text/html;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = nombreArchivoSalida + '.html';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    Swal.fire({ icon: 'success', title: 'Descarga completada', text: `Archivo guardado como ${nombreArchivoSalida}.html`, confirmButtonColor: '#059669', timer: 2000, showConfirmButton: false });
                };
                convertirBtn.disabled = false;
                convertirBtn.innerHTML = '<span class="btn-icon">⚡</span> Convertir a HTML';
            }).catch(err => { console.error(err); Swal.fire({ icon: 'error', title: 'Error en conversión', text: err.message, confirmButtonColor: '#ef4444' }); convertirBtn.disabled = false; convertirBtn.innerHTML = '<span class="btn-icon">⚡</span> Convertir a HTML'; });
        };
        reader.readAsArrayBuffer(archivo);
        inicializarReglas();
    });
});

// ============================================================
// RECUADRO CON SweetAlert2 (sin cambios)
// ============================================================
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