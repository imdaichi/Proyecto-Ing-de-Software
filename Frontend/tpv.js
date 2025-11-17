// tpv.js (Versión 7.0 - ¡COMPLETO Y FINAL!)

// --- FUNCIÓN AYUDANTE PARA CLP ---
function formatearPesoChileno(numero) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(numero);
}
// ------------------------------------------

// --- ¡¡EL GUARDIA DE SEGURIDAD!! ---
const usuarioJSON = sessionStorage.getItem('usuarioLogueado');
const usuario = JSON.parse(usuarioJSON);
if (!usuario) {
    alert('¡Acceso denegado! Debes iniciar sesión.');
    window.location.href = 'index.html';
} else {
    iniciarTPV(); 
}
// ------------------------------------

function iniciarTPV() {
       const botonProbar = document.getElementById('btn-probar-notificacion');

       if (botonProbar) {
           botonProbar.addEventListener('click', () => {
               agregarNotificacion("Esta es una notificación de prueba", "info");
         });
       }

    // --- 1. DEFINICIONES DE ELEMENTOS (¡COMPLETO!) ---
    
    // Panel
    const bienvenidaElement = document.getElementById('bienvenida-usuario');
    const rolElement = document.getElementById('rol-usuario');
    const logoutButton = document.getElementById('btn-logout');

    // Venta
    const escanerInput = document.getElementById('escaner-sku');
    const listaElement = document.getElementById('lista-productos-escaneados');
    const totalElement = document.getElementById('venta-total');
    
    // Botones de Acción
    const botonCobrar = document.getElementById('btn-cobrar');
    const botonBuscar = document.getElementById('btn-buscar');
    const botonProducto = document.getElementById('btn-producto');
    const botonDescuento = document.getElementById('btn-descuento');
    const botonCancelar = document.getElementById('btn-cancelar');

    // Panel de Admin
    const tituloAdmin = document.querySelector('.titulo-admin');
    const botonesAdmin = document.querySelectorAll('.btn-admin');
    const botonReportes = document.getElementById('btn-reportes');
    // (Listener de Admin "Reportes")
    

// Opcional: Cerrar el panel si se hace clic fuera de él
document.addEventListener('click', (event) => {
    
    // Si el panel está visible
    if (panelNotificacionesFlotante.classList.contains('visible') &&
        
        // Y si el clic NO fue DENTRO del panel
        !panelNotificacionesFlotante.contains(event.target) &&
        
        // Y si el clic NO fue EN el botón de la campana
        !btnToggleNotificaciones.contains(event.target)) 
    {
        // Entonces, ciérralo
        panelNotificacionesFlotante.classList.remove('visible');
    }
});
    
    const botonUsuarios = document.getElementById('btn-usuarios'); 

    // Elementos del Modal de Edición
    const modalOverlay = document.getElementById('modal-editar-producto');
    const modalCerrar = document.getElementById('modal-cerrar');
    const modalSkuInput = document.getElementById('modal-sku-input');
    const modalBuscarSku = document.getElementById('modal-buscar-sku');
    const modalForm = document.getElementById('modal-form-editar');
    const modalTitulo = document.getElementById('modal-titulo-producto');
    const modalPrecio = document.getElementById('modal-precio');
    const modalStock = document.getElementById('modal-stock');
    const modalVariantes = document.getElementById('modal-variantes');
    const modalGuardar = document.getElementById('modal-guardar-cambios');

    //NOTIFICACIONES
    const btnToggleNotificaciones = document.getElementById('btn-toggle-notificaciones');
    const panelNotificacionesFlotante = document.getElementById('panel-notificaciones-flotante');
    const listaNotificaciones = document.getElementById('lista-notificaciones'); // Este ya lo tenías
    const contadorNotificaciones = document.getElementById('contador-notificaciones');

    let notificacionesNoLeidas = 0; 


    // --- 2. VARIABLES GLOBALES DE LA FUNCIÓN ---
    const API_URL = 'http://localhost:8000/api/productos'; 
    let ventaActual = []; 
    let skuEnModal = null; // Para recordar qué SKU estamos editando


    // --- 3. LÓGICA DE INICIO (Saludo, Logout, Roles) ---
    
    const emailCompleto = usuario.email;
    const nombreUsuario = emailCompleto.split('@')[0];
    bienvenidaElement.innerText = `Bienvenido ${nombreUsuario}`;
    rolElement.innerText = usuario.rol;
    if (listaNotificaciones) {
        listaNotificaciones.innerHTML = '<li class="placeholder">No se encuentran notificaciones.</li>';
    }

    logoutButton.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres cerrar sesión?')) {
            sessionStorage.removeItem('usuarioLogueado');
            window.location.href = 'index.html';
        }
        
    });
    // (Listener de Notificaciones)
    // (Listener de Notificaciones)
    btnToggleNotificaciones.addEventListener('click', (e) => {
        
        // Detiene la propagación para que el listener de "cerrar afuera" no se active
        e.stopPropagation(); 

        // 1. Muestra u oculta el panel
        panelNotificacionesFlotante.classList.toggle('visible');

        // 2. Si el panel AHORA está visible (o sea, lo acabamos de abrir)
        if (panelNotificacionesFlotante.classList.contains('visible')) {
            
            // 3. Reseteamos el contador
            notificacionesNoLeidas = 0;
            contadorNotificaciones.innerText = '0';
            contadorNotificaciones.style.display = 'none'; // Ocultamos la "pastilla" roja

            // 4. ¡NUEVO! Limpiamos la lista HTML
           
        }
    });
    // (Listener de Notificaciones)
    
    if (usuario.rol !== 'admin') {
        botonCancelar.style.display = 'none';
        botonDescuento.style.display = 'none';
    }
    if (usuario.rol === 'admin') {
        if (tituloAdmin) tituloAdmin.style.display = 'block';
        botonesAdmin.forEach(boton => {
            boton.style.display = 'block';
        });
    }

    // --- 4. ACCIONES (EVENT LISTENERS) ---
    
    // (Listeners de la Venta Principal)
    botonCancelar.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres limpiar esta venta?')) {
            ventaActual = [];
            actualizarPantallaVenta();
        }
    });
    // UBICACIÓN: Sección 4 (REEMPLAZA tu 'listaElement.addEventListener' por este)

// UBICACIÓN: Sección 4 (El listener para Clics en BOTONES)

listaElement.addEventListener('click', (e) => {
    // Busca el botón más cercano que fue clickeado
    const target = e.target.closest('button');

    // Si no se hizo clic en un botón, no hagas nada
    if (!target) return;

    // Obtiene el índice (la "marca") del botón
    const index = target.dataset.index;
    
    // Si el botón no tiene un índice, no hagas nada
    if (index === undefined) return;

    // --- MINI ROUTER DE CLICS ---

    // 1. Si es un botón de control de cantidad
    if (target.classList.contains('btn-cantidad-control')) {
        const accion = target.dataset.accion;
        
        if (accion === 'aumentar') {
            aumentarCantidad(index);
        } else if (accion === 'disminuir') {
            disminuirCantidad(index);
        }
    }

    // 2. Si es un botón de eliminar
    if (target.classList.contains('btn-eliminar-item')) {
        // (Aquí puedes volver a poner tu 'confirm' si quieres)
        eliminarItemPorIndex(index);
    }
});
listaElement.addEventListener('change', (e) => {
    
    // Si el elemento que cambió tiene la clase 'cantidad-input'
    if (e.target.classList.contains('cantidad-input')) {
        
        const index = e.target.dataset.index;
        const nuevoValorStr = e.target.value;
        
        // Llamamos a la función que ya creaste
        actualizarCantidadManualmente(index, nuevoValorStr);
    }
});
// UBICACIÓN: Sección 4 (Pégalo debajo de tus otros 2 'listaElement.addEventListener')

// ¡NUEVO LISTENER! Para capturar "Enter" en las cajas de cantidad
listaElement.addEventListener('keydown', (e) => {
    
    // 1. Si la tecla no es "Enter", no hagas nada.
    if (e.key !== 'Enter') return;
    
    // 2. Si la tecla SÍ es "Enter" Y estamos en una caja de cantidad
    if (e.target.classList.contains('cantidad-input')) {
        
        // 3. Prevenimos el comportamiento por defecto (como enviar un formulario)
        e.preventDefault();
        
        // 4. ¡LA MAGIA! Forzamos que el input pierda el foco.
        //    Esto disparará automáticamente nuestro listener de 'change'
        //    y actualizará la cantidad.
        e.target.blur();
    }
});
    
    
    
    
    escanerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const sku = e.target.value.trim();
            if (sku) buscarProductoPorSku(e.target.value);
            e.target.value = '';
        }
    });

    // (Listeners del Modal de Admin)
    if (botonUsuarios) {
        botonUsuarios.addEventListener('click', () => {
            modalForm.classList.remove('visible');
            modalSkuInput.value = '';
            skuEnModal = null;
            modalOverlay.classList.add('visible');
            modalSkuInput.focus();
        });
    }

    modalCerrar.addEventListener('click', () => {
        modalOverlay.classList.remove('visible');
    });

    modalBuscarSku.addEventListener('click', async () => {
        const sku = modalSkuInput.value.trim();
        if (!sku) return;
        try {
            const response = await fetch(`${API_URL}?sku=${sku}`);
            if (!response.ok) {
                alert('¡Producto no encontrado!');
                return;
            }
            const producto = await response.json();
            
            skuEnModal = producto['SKU Padre y Variante']; 
            modalTitulo.innerText = producto.Titulo;
            modalPrecio.value = parseFloat(producto['Precio Venta'] || 0);
            modalStock.value = parseInt(producto.Stock || 0);
            modalVariantes.value = producto.Variantes || '-';
            modalForm.classList.add('visible');
        } catch (error) {
            console.error('Error al buscar producto:', error);
            alert('Error de conexión al buscar el producto.');
        }
    });

    modalGuardar.addEventListener('click', async () => {
        if (!skuEnModal) {
            alert('Por favor, primero busca un producto para editar.');
            return;
        }
        const nuevosDatos = {
            "Precio Venta": modalPrecio.value,
            "Stock": modalStock.value,
            "Variantes": modalVariantes.value
        };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: skuEnModal,
                    data: nuevosDatos
                })
            });
            const resultado = await response.json();
            if (!response.ok) {
                throw new Error(resultado.error || 'Error desconocido');
            }
            alert(`¡Éxito! ${resultado.mensaje}`);
            modalOverlay.classList.remove('visible'); 
        } catch (error) {
            console.error('Error al guardar:', error);
            alert(`Error al guardar los cambios: ${error.message}`);
        }
    });

    // (Listener de Admin "Reportes")
    
    


    // --- 5. FUNCIONES INTERNAS (¡COMPLETAS!) ---
    
    
    async function buscarProductoPorSku(sku) {
    try {
        const response = await fetch(`${API_URL}?sku=${sku}`);
        if (!response.ok) {
            
            // ANTES: alert("¡Error! Producto...");
            // AHORA:
            agregarNotificacion(`SKU ${sku} no encontrado.`, 'error');
            return;
        }
        
        const producto = await response.json();
        const skuProducto = producto['SKU Padre y Variante'];

        const itemExistente = ventaActual.find(item => item.sku === skuProducto);

        if (itemExistente) {
            itemExistente.cantidad++;
        } else {
            ventaActual.push({
                sku: skuProducto,
                producto: producto,
                cantidad: 1
            });
        }
        
        actualizarPantallaVenta();
        
        // AVISA DEL ÉXITO:
        agregarNotificacion(`Agregado: ${producto.Titulo}`, 'exito');

    } catch (error) {
        console.error("Error de conexión con la API:", error);
        
        // ANTES: alert("Error de conexión...");
        // AHORA:
        agregarNotificacion('Error de conexión con la API.', 'error');
    }
}
    

function actualizarCantidadManualmente(index, nuevoValorStr) {
    const item = ventaActual[index];
    if (!item) return; // Seguridad
    
    const cantidad = parseInt(nuevoValorStr);

    // --- Validación ---
    // Si no es un número o es negativo, no hagas nada (o resetea)
    if (isNaN(cantidad) || cantidad < 0) {
        // Simplemente volvemos a dibujar. El input
        // tomará el valor "viejo" que aún está en ventaActual
        actualizarPantallaVenta();
        return;
    }

    // --- Lógica de Actualización ---
    if (cantidad === 0) {
        // Si el usuario pone 0, eliminamos el item
        eliminarItemPorIndex(index);
    } else {
        // Si es un número válido, actualizamos la cantidad
        item.cantidad = cantidad;
        // Y volvemos a dibujar para que el TOTAL se actualice
        actualizarPantallaVenta();
    }
}
function actualizarPantallaVenta() {
    listaElement.innerHTML = '';
    let total = 0; 

    if (ventaActual.length === 0) {
        listaElement.innerHTML = '<p class="placeholder">Esperando escaneo...</p>';
    } else {
        ventaActual.forEach((item, index) => {
            const precioNumerico = parseFloat(item.producto['Precio Venta'] || 0);
            const precioTotalItem = precioNumerico * item.cantidad;
            const precioFormateado = formatearPesoChileno(precioTotalItem);
            
            // --- ¡EL HTML MODIFICADO ESTÁ AQUÍ! ---
            const itemHtml = `
                <div class="item-producto">
                    <div class="item-info">
                        <div class="nombre">${item.producto.Titulo || 'Producto sin título'}</div>
                        <div class="sku">SKU: ${item.sku}</div>
                        <div class="sku">Variante: ${item.producto.Variantes || '-'}</div>
                    </div>
                    
                    <div class="precio">${precioFormateado}</div>
                    
                    <div class="controles-cantidad">
                        <button class="btn-cantidad-control" data-index="${index}" data-accion="disminuir">
                            <img src="Flechaabajo.png" alt="Disminuir" style="width: 16px; height: 16px;">
                        </button>
                        
                        <input type="number" 
                               class="cantidad-input" 
                               value="${item.cantidad}" 
                               data-index="${index}" 
                               min="0">
                        
                        <button class="btn-cantidad-control" data-index="${index}" data-accion="aumentar">
                            <img src="Flechaarriba.png" alt="Disminuir" style="width: 16px; height: 16px;">
                        </button>
                    </div>
                    
                    <button class="btn-eliminar-item" data-index="${index}">
                        <img src="basurero.png" alt="Eliminar" style="width: 20px; height: 20px;">
                    </button>
                </div>
            `;
            listaElement.innerHTML += itemHtml;
            total += precioTotalItem;
        });
    }
    totalElement.innerText = formatearPesoChileno(total);
}

function eliminarItemPorIndex(index) {

    const indexNum = parseInt(index);
    
    ventaActual.splice(indexNum, 1);
    
    actualizarPantallaVenta();
}
// UBICACIÓN: Sección 5 (Pega estas DOS nuevas funciones)

// Nueva función para AUMENTAR cantidad
function aumentarCantidad(index) {
    const item = ventaActual[index];
    if (!item) return; // Seguridad
    
    item.cantidad++; // Suma 1
    
    actualizarPantallaVenta(); // Vuelve a dibujar todo
}

// Nueva función para DISMINUIR cantidad
function disminuirCantidad(index) {
    const item = ventaActual[index];
    if (!item) return; // Seguridad

    item.cantidad--; // Resta 1

    // ¡Importante! Si la cantidad llega a 0, lo eliminamos
    // (Reutilizamos la función que ya tenías)
    if (item.cantidad <= 0) {
        eliminarItemPorIndex(index);
    } else {
        actualizarPantallaVenta(); // Si no, solo actualiza la pantalla
    }
}
/**
 * Agrega un mensaje al panel de notificaciones flotante.
 * @param {string} mensaje - El texto de la notificación.
 * @param {string} tipo - 'info', 'error', o 'exito'
 */
function agregarNotificacion(mensaje, tipo = 'info') {
    // Seguridad: si los elementos no existen, no hagas nada
    if (!listaNotificaciones || !contadorNotificaciones) return; 

    // 1. Quitar el placeholder si es la primera notificación
    const placeholder = listaNotificaciones.querySelector('.placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    // 2. Crear el nuevo elemento <li> (¡Te faltaba esto!)
    const item = document.createElement('li');
    item.className = `notificacion-item ${tipo}`; // (¡Y esto!)
    
    const hora = new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // 3. Definir su contenido HTML
    item.innerHTML = `
        ${mensaje}
        <span class="hora">${hora}</span>
    `;

    // 4. Agregar al principio de la lista (¡Usando listaNotificaciones!)
    listaNotificaciones.prepend(item);

    // 5. Actualizar el contador de notificaciones no leídas
    notificacionesNoLeidas++;
    contadorNotificaciones.innerText = notificacionesNoLeidas;
    contadorNotificaciones.style.display = 'block'; // (¡Te faltaba esto!)
}
}           

