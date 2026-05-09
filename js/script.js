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
                    style: "max-width:100%; height:auto; display:block;"
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
// MEJORA ESTRUCTURAL
// ============================================================
function mejorarEstructuraHTML(htmlFragment) {
    const tempDiv = document.createElement('div');
    tempDiv.className = 'contenido-convertido';
    tempDiv.innerHTML = htmlFragment;
    
    const elementos = Array.from(tempDiv.children);
    let i = 0;
    while (i < elementos.length) {
        const elem = elementos[i];
        if (elem.nodeType !== Node.ELEMENT_NODE) { i++; continue; }
        
        const tag = elem.tagName.toLowerCase();
        const texto = elem.textContent.trim();
        const textoLower = texto.toLowerCase();
        
        if (i === 0 && tag === 'p' && (texto.includes('Artículo Original') || texto.includes('Original Article'))) {
            elem.classList.add('tipo-articulo');
        } else if (tag === 'p' && (texto.includes('^') || texto.includes('orcid.org'))) {
            elem.classList.add('autor');
        } else if (tag === 'p' && (texto.match(/^\^[0-9]+\^/) || textoLower.includes('universidad') || textoLower.includes('instituto'))) {
            elem.classList.add('afiliacion');
        } else if (tag === 'p' && (textoLower.includes('autor para correspondencia') || textoLower.includes('corresponding author'))) {
            elem.classList.add('correspondencia');
        } else if (tag === 'p' && (texto === 'RESUMEN' || texto === 'ABSTRACT')) {
            elem.classList.add('resumen-titulo');
        } else if (tag === 'p' && (textoLower.startsWith('palabras clave:') || textoLower.startsWith('keywords:'))) {
            elem.classList.add('palabras-clave');
        } else if (tag === 'p' && (textoLower.startsWith('recibido:') || textoLower.startsWith('aprobado:'))) {
            elem.classList.add('historico');
        } else if (tag === 'p' && texto.match(/^(INTRODUCCIÓN|MÉTODOS|RESULTADOS|DISCUSIÓN|REFERENCIAS)/i)) {
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
        i++;
    }
    return tempDiv.innerHTML;
}

// ============================================================
// GENERAR DOCUMENTO HTML (sin fecha)
// ============================================================
function generarDocumentoCompleto(contenidoMejorado, tituloPersonalizado) {
    const cssTexto = `
        body { background: #f5f5f5; margin: 20px; padding: 0; }
        .container-descargado { max-width: 1100px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tabla-con-bordes { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
        .tabla-con-bordes th, .tabla-con-bordes td { border: 1px solid #999; padding: 6px 10px; }
        .tabla-con-bordes th { background-color: #f0f0f0; }
        .imagen-convertida, .nueva-imagen { max-width: 100%; height: auto; margin: 0.5em 0; display: block; }
        hr { margin: 30px 0; }
    `;
    const escapeHTML = (str) => str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHTML(tituloPersonalizado)} - Convertido</title>
    <style>${cssTexto}</style>
</head>
<body>
    <div class="container-descargado">
        <h1>📄 ${escapeHTML(tituloPersonalizado)}</h1>
        ${contenidoMejorado}
    </div>
</body>
</html>`;
}

// ============================================================
// EDITOR COMPLETO
// ============================================================
let modoEdicion = false;
let htmlActual = '';

function aplicarComando(cmd, valor = null) {
    const contenido = obtenerContenidoEditable();
    if (!contenido || contenido.contentEditable !== 'true') return;
    contenido.focus();
    if (cmd === 'fontName') document.execCommand('fontName', false, valor);
    else if (cmd === 'fontSize') document.execCommand('fontSize', false, valor);
    else document.execCommand(cmd, false, valor);
}

function aplicarAlineacionImagen(cmd) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    let img = null;
    if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.tagName === 'IMG') {
        img = range.startContainer;
    } else if (range.startContainer instanceof Element && range.startContainer.querySelector('img')) {
        img = range.startContainer.querySelector('img');
    } else if (range.startContainer.parentElement && range.startContainer.parentElement.tagName === 'IMG') {
        img = range.startContainer.parentElement;
    }
    if (img && img.tagName === 'IMG') {
        if (cmd === 'justifyCenter') {
            img.style.display = 'block';
            img.style.marginLeft = 'auto';
            img.style.marginRight = 'auto';
        } else if (cmd === 'justifyLeft') {
            img.style.display = 'block';
            img.style.marginLeft = '0';
            img.style.marginRight = 'auto';
        } else if (cmd === 'justifyRight') {
            img.style.display = 'block';
            img.style.marginLeft = 'auto';
            img.style.marginRight = '0';
        }
        return true;
    }
    return false;
}

function obtenerContenidoEditable() {
    const vistaDiv = document.getElementById('vistaPrevia');
    return vistaDiv?.querySelector('.contenido-convertido');
}

function cambiarFuente() {
    const select = document.getElementById('fuenteSelect');
    aplicarComando('fontName', select.value);
}

function cambiarTamaño() {
    const select = document.getElementById('tamanoSelect');
    aplicarComando('fontSize', select.value);
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
                const imgHtml = `<img src="${base64}" class="nueva-imagen" style="max-width:100%; margin:0.5em 0; display:block;" alt="Imagen insertada">`;
                document.execCommand('insertHTML', false, imgHtml);
                const nuevaImg = contenido.querySelector('img:last-of-type');
                if (nuevaImg) addDragHandlers(nuevaImg);
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Modo edición',
                    text: 'Activa el modo edición antes de insertar imágenes.',
                    confirmButtonColor: '#3b82f6'
                });
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function addDragHandlers(img) {
    if (!img) return;
    img.setAttribute('draggable', 'true');
    img.style.cursor = 'grab';
    img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', img.id);
        e.dataTransfer.effectAllowed = 'move';
        img.style.cursor = 'grabbing';
    });
    img.addEventListener('dragend', (e) => {
        img.style.cursor = 'grab';
    });
    if (!img.id) img.id = 'img_' + Date.now() + '_' + Math.random();
}

function habilitarDragAndDrop() {
    const contenido = obtenerContenidoEditable();
    if (!contenido) return;
    
    contenido.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    contenido.addEventListener('drop', (e) => {
        e.preventDefault();
        const imgId = e.dataTransfer.getData('text/plain');
        const imgElement = document.getElementById(imgId);
        if (imgElement && imgElement.parentNode === contenido) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (range) {
                range.insertNode(imgElement);
                contenido.focus();
            }
        }
    });
    
    const images = contenido.querySelectorAll('img');
    images.forEach(addDragHandlers);
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'IMG') {
                    addDragHandlers(node);
                }
            });
        });
    });
    observer.observe(contenido, { childList: true, subtree: true });
}

function ocultarAreaCarga(ocultar) {
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.style.display = ocultar ? 'none' : 'block';
    }
}

function habilitarEdicion() {
    const contenido = obtenerContenidoEditable();
    if (contenido) {
        contenido.contentEditable = 'true';
        contenido.style.border = '2px solid #007bff';
        contenido.style.padding = '10px';
        contenido.style.backgroundColor = '#fffef7';
        modoEdicion = true;
        ocultarAreaCarga(true);
        document.getElementById('editarBtn').style.display = 'none';
        document.getElementById('guardarEdicionBtn').style.display = 'inline-block';
        document.getElementById('barraHerramientas').style.display = 'flex';
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                if (cmd && cmd.startsWith('justify')) {
                    if (!aplicarAlineacionImagen(cmd)) {
                        aplicarComando(cmd);
                    }
                } else if (cmd) {
                    aplicarComando(cmd);
                }
            };
        });
        document.getElementById('fuenteSelect').onchange = cambiarFuente;
        document.getElementById('tamanoSelect').onchange = cambiarTamaño;
        document.getElementById('insertarImagenBtn').onclick = insertarImagenManual;
        document.getElementById('anadirLogoBtn').onclick = anadirLogo;
        document.getElementById('aplicarLogoBtn').onclick = aplicarControlesLogo;
        
        habilitarDragAndDrop();
    }
}

function guardarEdicion() {
    const contenido = obtenerContenidoEditable();
    if (contenido) {
        contenido.contentEditable = 'false';
        contenido.style.border = 'none';
        contenido.style.padding = '';
        contenido.style.backgroundColor = '';
        modoEdicion = false;
        ocultarAreaCarga(false);
        document.getElementById('editarBtn').style.display = 'inline-block';
        document.getElementById('guardarEdicionBtn').style.display = 'none';
        document.getElementById('barraHerramientas').style.display = 'none';
        
        const nuevoHtml = contenido.innerHTML;
        htmlActual = nuevoHtml;
        Swal.fire({
            icon: 'success',
            title: 'Cambios guardados',
            text: 'El HTML descargable se ha actualizado.',
            confirmButtonColor: '#059669',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

function inicializarTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');
        });
    });
}

// ============================================================
// LOGOTIPO DE REVISTA
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
            if (contenido) {
                let logoExistente = contenido.querySelector('.logo-revista');
                if (logoExistente) {
                    logoExistente.src = base64;
                } else {
                    const logoImg = document.createElement('img');
                    logoImg.src = base64;
                    logoImg.className = 'logo-revista';
                    logoImg.style.display = 'block';
                    logoImg.style.margin = '10px auto';
                    logoImg.style.maxWidth = '80px';
                    logoImg.style.opacity = '1';
                    contenido.insertBefore(logoImg, contenido.firstChild);
                }
                document.getElementById('controlesLogo').style.display = 'flex';
                const logoActual = contenido.querySelector('.logo-revista');
                if (logoActual) {
                    document.getElementById('logoTamano').value = parseInt(logoActual.style.maxWidth) || 80;
                    document.getElementById('logoOpacidad').value = logoActual.style.opacity || 1;
                }
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function aplicarControlesLogo() {
    const contenido = obtenerContenidoEditable();
    const logo = contenido.querySelector('.logo-revista');
    if (logo) {
        const tamaño = document.getElementById('logoTamano').value;
        const opacidad = document.getElementById('logoOpacidad').value;
        logo.style.maxWidth = tamaño + 'px';
        logo.style.opacity = opacidad;
    }
}

// ============================================================
// EVENTO PRINCIPAL
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    inicializarTabs();
    const convertirBtn = document.getElementById('convertirBtn');
    const fileInput = document.getElementById('inputWord');
    const resultadoDiv = document.getElementById('resultado');
    document.getElementById('editarBtn').addEventListener('click', habilitarEdicion);
    document.getElementById('guardarEdicionBtn').addEventListener('click', guardarEdicion);
    
    convertirBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin archivo',
                text: 'Selecciona un archivo .docx',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }
        const archivo = fileInput.files[0];
        if (!/\.docx$/i.test(archivo.name)) {
            Swal.fire({
                icon: 'error',
                title: 'Formato incorrecto',
                text: 'El archivo debe ser .docx',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        
        const nombreInput = document.getElementById('nombreArchivo');
        if (nombreInput) {
            nombreInput.value = archivo.name.replace(/\.docx$/i, '');
        }
        
        convertirBtn.disabled = true;
        convertirBtn.textContent = '⏳ Convirtiendo...';
        const reader = new FileReader();
        reader.onload = function(e) {
            mammoth.convertToHtml({ arrayBuffer: e.target.result }, {
                convertImage: crearConvertidorImagenes(),
                styleMap: ["p[style-name='Heading 1'] => h1", "p[style-name='Heading 2'] => h2"]
            }).then(result => {
                const htmlMejorado = mejorarEstructuraHTML(result.value);
                htmlActual = htmlMejorado;
                const vistaDiv = document.getElementById('vistaPrevia');
                vistaDiv.innerHTML = `<div class="contenido-convertido">${htmlMejorado}</div>`;
                resultadoDiv.style.display = 'block';
                resultadoDiv.scrollIntoView({ behavior: 'smooth' });
                
                // Botón descargar con SweetAlert confirm
                document.getElementById('descargarBtn').onclick = async () => {
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
                        if (result.isConfirmed) {
                            guardarEdicion();
                        }
                    }
                    const finalHtml = obtenerContenidoEditable()?.innerHTML || htmlActual;
                    let nombreArchivoSalida = document.getElementById('nombreArchivo').value.trim();
                    if (nombreArchivoSalida === '') {
                        nombreArchivoSalida = archivo.name.replace(/\.docx$/i, '');
                    }
                    const blob = new Blob([generarDocumentoCompleto(finalHtml, nombreArchivoSalida)], {type: 'text/html;charset=utf-8'});
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
                
                convertirBtn.disabled = false;
                convertirBtn.textContent = 'Convertir a HTML';
            }).catch(err => {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error en conversión',
                    text: err.message,
                    confirmButtonColor: '#ef4444'
                });
                convertirBtn.disabled = false;
                convertirBtn.textContent = 'Convertir a HTML';
            });
        };
        reader.readAsArrayBuffer(archivo);
    });
});