const API_URL = 'http://localhost:8000';

function formatearPeso(num) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num);
}

window.onload = function () {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioLogueado'));
    if (!usuario) { window.location.href = '../index.html'; return; }

    document.getElementById('bienvenida-usuario').innerText = `Hola, ${usuario.nombre || usuario.email}`;

    const rol = (usuario.rol || usuario.role || '').toLowerCase();

    if (rol === 'admin' || rol === 'administrador') {
        const btnVolver = document.getElementById('btn-volver-dash');
        if (btnVolver) {
            btnVolver.style.display = 'block'; 

            btnVolver.addEventListener('click', () => {
                window.location.href = '../Dashboard/';
            });
        }
    }
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('usuarioLogueado');
        window.location.href = '../index.html';
    });

    iniciarVentas(usuario);
};

function iniciarVentas(usuario) {
    let ventaActual = [];
    const escaner = document.getElementById('escaner-sku');
    const lista = document.getElementById('lista-productos-escaneados');
    const totalEl = document.getElementById('venta-total');

    // Verificar si ya se hizo cierre de caja hoy
    verificarEstadoCierre();

    window.cambiarCantidad = function (index, delta) {
        if (ventaActual[index]) {
            ventaActual[index].cantidad += delta;
            if (ventaActual[index].cantidad <= 0) {
                ventaActual.splice(index, 1);
            }
            actualizar();
        }
    };

    window.eliminarItem = function (index) {
        if (confirm('¿Eliminar este producto?')) {
            ventaActual.splice(index, 1);
            actualizar();
        }
    };

    escaner.focus();
    escaner.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const sku = escaner.value.trim();
            if (sku) await buscar(sku);
        }
    });

    async function buscar(sku) {
        escaner.disabled = true;
        try {
            const res = await fetch(`${API_URL}/productos/${encodeURIComponent(sku)}`);
            if (!res.ok) {
                mostrarError('Producto no encontrado');
                escaner.select();
                return;
            }
            const prod = await res.json();

            // Verificar si el producto está inactivo
            if (prod.estado && prod.estado.toLowerCase() !== 'activo') {
                mostrarError(`El producto ${prod.Titulo || sku} está inactivo y no se puede vender`);
                escaner.value = '';
                escaner.focus();
                return;
            }

            // Verificar si hay stock
            const stock = parseInt(prod.Stock || prod.stock || 0);
            if (stock <= 0) {
                mostrarError(`Sin stock disponible para ${prod.Titulo || sku}`);
                escaner.value = '';
                escaner.focus();
                return;
            }

            const existe = ventaActual.find(i => i.sku === (prod.id_sku_en_db || sku));
            if (existe) {
                // Verificar si hay stock suficiente
                if (existe.cantidad >= stock) {
                    mostrarError(`Stock insuficiente para ${prod.Titulo || sku}. Stock disponible: ${stock}`);
                    escaner.value = '';
                    escaner.focus();
                    return;
                }
                existe.cantidad++;
            } else {
                ventaActual.push({ sku: prod.id_sku_en_db || sku, producto: prod, cantidad: 1 });
            }

            actualizar();
            escaner.value = ''; 
            escaner.focus();
        } catch (e) { 
            mostrarError(e.message || 'Error al buscar producto'); 
            escaner.select(); 
        }
        finally { escaner.disabled = false; escaner.focus(); }
    }

    function actualizar() {
        lista.innerHTML = '';
        let total = 0;
        ventaActual.forEach((item, index) => {
            const p = parseFloat(item.producto['Precio Venta'] || 0);
            total += p * item.cantidad;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-producto';
            itemDiv.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;';

            itemDiv.innerHTML = `
                <div style="flex:1;">
                    <strong>${item.producto.Titulo}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:flex; flex-direction:column; gap:0;">
                        <button onclick="cambiarCantidad(${index}, 1)" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:2px; line-height:1;" title="Aumentar">⬆️</button>
                        <button onclick="cambiarCantidad(${index}, -1)" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:2px; line-height:1;" title="Disminuir">⬇️</button>
                    </div>
                    <span style="min-width:40px; text-align:center; font-weight:bold;">x${item.cantidad}</span>
                </div>
                <div style="min-width:100px; text-align:right; font-weight:bold;">${formatearPeso(p * item.cantidad)}</div>
                <button onclick="eliminarItem(${index})" style="background:none; border:none; cursor:pointer; font-size:1.3rem; padding:5px; margin-left:10px;" title="Eliminar">🗑️</button>
            `;

            lista.appendChild(itemDiv);
        });
        totalEl.innerText = formatearPeso(total);
    }

    const btnCantidad = document.getElementById('btn-buscar');
    if (btnCantidad) {
        btnCantidad.addEventListener('click', () => {
            if (ventaActual.length) {
                const c = prompt("Ingrese la cantidad a agregar:");
                const n = parseInt(c, 10);
                if (!isNaN(n) && n > 0) {
                    ventaActual[ventaActual.length - 1].cantidad *= n;
                    actualizar();
                }
            }
        });
    }

    document.getElementById('btn-cancelar').addEventListener('click', () => {
        if (confirm("¿Limpiar?")) { ventaActual = []; actualizar(); escaner.focus(); }
    });

    const modalMetodoPago = document.getElementById('modal-metodo-pago');
    const cerrarModalPago = document.getElementById('cerrar-modal-pago');
    const totalACobrar = document.getElementById('total-a-cobrar');
    const botonesMetodoPago = document.querySelectorAll('.btn-metodo-pago');

    document.getElementById('btn-cobrar').addEventListener('click', () => {
        if (ventaActual.length === 0) {
            alert("No hay productos en la venta");
            return;
        }

        const totalFinal = ventaActual.reduce((acc, i) => acc + (parseFloat(i.producto['Precio Venta'] || 0) * i.cantidad), 0);
        totalACobrar.innerText = `Total: ${formatearPeso(totalFinal)}`;


        modalMetodoPago.style.display = 'flex';
    });


    cerrarModalPago.addEventListener('click', () => {
        modalMetodoPago.style.display = 'none';
    });


    modalMetodoPago.addEventListener('click', (e) => {
        if (e.target === modalMetodoPago) {
            modalMetodoPago.style.display = 'none';
        }
    });


    botonesMetodoPago.forEach(btn => {
        btn.addEventListener('click', async () => {
            const metodoPago = btn.getAttribute('data-metodo');
            const totalFinal = ventaActual.reduce((acc, i) => acc + (parseFloat(i.producto['Precio Venta'] || 0) * i.cantidad), 0);

            try {
                // Reducir payload: solo enviar campos necesarios por ítem
                const itemsMin = ventaActual.map(i => ({
                    sku: i.sku,
                    cantidad: i.cantidad,
                    titulo: i.producto?.Titulo || i.producto?.titulo || undefined
                }));
                const res = await fetch(`${API_URL}/ventas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email_usuario: usuario.email,
                        items: itemsMin,
                        total: totalFinal,
                        metodo_pago: metodoPago,
                        estado: 'completada'
                    })
                });

                if (res.ok) {
                    // Mostrar modal de confirmación personalizado
                    const modalConfirmacion = document.getElementById('modal-confirmacion');
                    const mensajeConfirmacion = document.getElementById('mensaje-confirmacion');
                    const metodoConfirmacion = document.getElementById('metodo-confirmacion');
                    
                    // Obtener nombre del método de pago
                    const nombreMetodo = {
                        'mercado_pago': 'Mercado Pago',
                        'debito': 'Tarjeta de Débito',
                        'credito': 'Tarjeta de Crédito',
                        'efectivo': 'Efectivo'
                    }[metodoPago] || metodoPago;
                    
                    mensajeConfirmacion.textContent = `Venta de ${formatearPeso(totalFinal)} procesada correctamente`;
                    metodoConfirmacion.textContent = `Método de pago: ${nombreMetodo}`;
                    modalConfirmacion.style.display = 'flex';
                    
                    ventaActual = [];
                    actualizar();
                    modalMetodoPago.style.display = 'none';
                } else {
                    const err = await res.json().catch(()=>({}));
                    mostrarError(err.error || 'Error desconocido al procesar la venta');
                    modalMetodoPago.style.display = 'none';
                }
            } catch (e) {
                mostrarError('Error de conexión con el servidor');
                modalMetodoPago.style.display = 'none';
            }
        });
    });

    // Cerrar modal de confirmación
    const btnCerrarConfirmacion = document.getElementById('btn-cerrar-confirmacion');
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    
    btnCerrarConfirmacion.addEventListener('click', () => {
        modalConfirmacion.style.display = 'none';
        escaner.focus();
    });
    
    modalConfirmacion.addEventListener('click', (e) => {
        if (e.target === modalConfirmacion) {
            modalConfirmacion.style.display = 'none';
            escaner.focus();
        }
    });

    // Función para mostrar modal de error
    function mostrarError(mensaje) {
        const modalError = document.getElementById('modal-error');
        const mensajeError = document.getElementById('mensaje-error');
        mensajeError.textContent = mensaje;
        modalError.style.display = 'flex';
    }

    // Cerrar modal de error
    const btnCerrarError = document.getElementById('btn-cerrar-error');
    const modalError = document.getElementById('modal-error');
    
    btnCerrarError.addEventListener('click', () => {
        modalError.style.display = 'none';
        escaner.focus();
    });
    
    modalError.addEventListener('click', (e) => {
        if (e.target === modalError) {
            modalError.style.display = 'none';
            escaner.focus();
        }
    });

    // Verificar si ya se hizo cierre de caja hoy
    async function verificarEstadoCierre() {
        try {
            const res = await fetch(`${API_URL}/cierre-caja`);
            const data = await res.json();

            if (res.ok && data.cierre_realizado) {
                // Deshabilitar interfaz de ventas
                document.getElementById('btn-cobrar').disabled = true;
                document.getElementById('btn-cobrar').style.opacity = '0.5';
                document.getElementById('btn-cobrar').style.cursor = 'not-allowed';
                document.getElementById('escaner-sku').disabled = true;
                document.getElementById('escaner-sku').placeholder = '⚠️ Caja cerrada - No se pueden realizar ventas hoy';
                document.getElementById('escaner-sku').style.background = '#f8d7da';
                
                // Mostrar mensaje
                alert('⚠️ El cierre de caja del día ya fue realizado.\nNo se pueden realizar más ventas hasta mañana.');
            }
        } catch (error) {
            console.error('Error al verificar estado de cierre:', error);
        }
    }
}