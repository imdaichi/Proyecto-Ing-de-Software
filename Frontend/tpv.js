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


    // --- 2. VARIABLES GLOBALES DE LA FUNCIÓN ---
    const API_URL = 'http://localhost:8000/api/productos'; 
    let ventaActual = []; 
    let skuEnModal = null; // Para recordar qué SKU estamos editando


    // --- 3. LÓGICA DE INICIO (Saludo, Logout, Roles) ---
    
    const emailCompleto = usuario.email;
    const nombreUsuario = emailCompleto.split('@')[0];
    bienvenidaElement.innerText = `Bienvenido ${nombreUsuario}`;
    rolElement.innerText = usuario.rol;

    logoutButton.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres cerrar sesión?')) {
            sessionStorage.removeItem('usuarioLogueado');
            window.location.href = 'index.html';
        }
    });
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
    
    botonProducto.addEventListener('click', () => {
        if (ventaActual.length === 0) {
            alert('No hay productos para eliminar.');
            return;
        }
        const ultimoItem = ventaActual[ventaActual.length - 1];
        ultimoItem.cantidad--;
        if (ultimoItem.cantidad <= 0) {
            ventaActual.pop(); 
        }
        actualizarPantallaVenta();
    });
    
    botonBuscar.addEventListener('click', () => {
        if (ventaActual.length === 0) {
            alert('Primero debe escanear un producto.');
            return;
        }
        const ultimoItem = ventaActual[ventaActual.length - 1];
        const cantidadStr = prompt(`¿Qué cantidad TOTAL desea para "${ultimoItem.producto.Titulo}"?`, ultimoItem.cantidad);
        if (cantidadStr === null) return;
        const cantidad = parseInt(cantidadStr);
        if (isNaN(cantidad) || cantidad < 0) {
            alert('Por favor, ingrese un número válido.');
            return;
        }
        if (cantidad === 0) {
            ventaActual.pop();
        } else {
            ultimoItem.cantidad = cantidad;
        }
        actualizarPantallaVenta();
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
    if (botonReportes) {
        botonReportes.addEventListener('click', () => alert('Función "Ver Reportes" (¡Pendiente!)'));
    }


    // --- 5. FUNCIONES INTERNAS (¡COMPLETAS!) ---
    
    async function buscarProductoPorSku(sku) {
        try {
            const response = await fetch(`${API_URL}?sku=${sku}`);
            if (!response.ok) {
                alert("¡Error! Producto con SKU " + sku + " no encontrado.");
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
        } catch (error) {
            console.error("Error de conexión con la API:", error);
            alert("Error de conexión. Revisa la consola F12 y el estado de CORS.");
        }
    }

    // ¡ESTA FUNCIÓN AHORA ESTÁ COMPLETA!
    function actualizarPantallaVenta() {
        listaElement.innerHTML = '';
        let total = 0; 

        if (ventaActual.length === 0) {
            listaElement.innerHTML = '<p class="placeholder">Esperando escaneo...</p>';
        } else {
            ventaActual.forEach(item => {
                const precioNumerico = parseFloat(item.producto['Precio Venta'] || 0);
                const precioTotalItem = precioNumerico * item.cantidad;
                const precioFormateado = formatearPesoChileno(precioTotalItem);
                const itemHtml = `
                    <div class="item-producto">
                        <div class="item-info">
                            <div class="nombre">${item.producto.Titulo || 'Producto sin título'} <strong>(x${item.cantidad})</strong></div>
                            <div class="sku">SKU: ${item.sku}</div>
                            <div class="sku">Variante: ${item.producto.Variantes || '-'}</div>
                        </div>
                        <div class="precio">${precioFormateado}</div>
                    </div>
                `;
                listaElement.innerHTML += itemHtml;
                total += precioTotalItem;
            });
        }
        totalElement.innerText = formatearPesoChileno(total);
    }

    // --- 6. EJECUCIÓN INICIAL ---
    actualizarPantallaVenta();

}