const API_URL = 'http://localhost:8000';

function formatearPeso(num) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num);
}

// Función para mostrar modal de confirmación con opciones
function mostrarConfirmacion(mensaje, onAceptar, onCancelar) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <h2 style="color: #29542e; margin: 0 0 20px 0; font-size: 1.3rem; text-align: center;">${mensaje}</h2>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="btn-confirm-aceptar" class="btn-success" style="flex: 1; padding: 12px 20px; background-color: #29542e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Aceptar</button>
                <button id="btn-confirm-cancelar" style="flex: 1; padding: 12px 20px; background-color: #95a5a6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const btnAceptar = modal.querySelector('#btn-confirm-aceptar');
    const btnCancelar = modal.querySelector('#btn-confirm-cancelar');
    
    btnAceptar.addEventListener('click', () => {
        modal.remove();
        if (onAceptar) onAceptar();
    });
    
    btnCancelar.addEventListener('click', () => {
        modal.remove();
        if (onCancelar) onCancelar();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancelar) onCancelar();
        }
    });
}

// Función para mostrar modal de input
function mostrarInputModal(titulo, placeholder, onAceptar, onCancelar) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <h2 style="color: #29542e; margin: 0 0 20px 0; font-size: 1.3rem; text-align: center;">${titulo}</h2>
            <input type="text" id="input-modal" placeholder="${placeholder}" style="width: 100%; padding: 12px; border: 2px solid #29542e; border-radius: 8px; font-size: 1rem; box-sizing: border-box; margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="btn-input-aceptar" style="flex: 1; padding: 12px 20px; background-color: #29542e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Aceptar</button>
                <button id="btn-input-cancelar" style="flex: 1; padding: 12px 20px; background-color: #95a5a6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#input-modal');
    const btnAceptar = modal.querySelector('#btn-input-aceptar');
    const btnCancelar = modal.querySelector('#btn-input-cancelar');
    
    input.focus();
    
    const handleAceptar = () => {
        const valor = input.value.trim();
        modal.remove();
        if (onAceptar) onAceptar(valor);
    };
    
    const handleCancelar = () => {
        modal.remove();
        if (onCancelar) onCancelar();
    };
    
    btnAceptar.addEventListener('click', handleAceptar);
    btnCancelar.addEventListener('click', handleCancelar);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAceptar();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancelar();
    });
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
        mostrarConfirmacion('¿Eliminar este producto?', () => {
            ventaActual.splice(index, 1);
            actualizar();
        });
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
                mostrarInputModal('Ingrese la cantidad a agregar:', 'Cantidad', (valor) => {
                    const n = parseInt(valor, 10);
                    if (!isNaN(n) && n > 0) {
                        ventaActual[ventaActual.length - 1].cantidad *= n;
                        actualizar();
                    }
                });
            }
        });
    }

    document.getElementById('btn-cancelar').addEventListener('click', () => {
        mostrarConfirmacion('¿Limpiar la venta?', () => {
            ventaActual = [];
            actualizar();
            escaner.focus();
        });
    });

    const modalMetodoPago = document.getElementById('modal-metodo-pago');
    const cerrarModalPago = document.getElementById('cerrar-modal-pago');
    const totalACobrar = document.getElementById('total-a-cobrar');
    const botonesMetodoPago = document.querySelectorAll('.btn-metodo-pago');

    document.getElementById('btn-cobrar').addEventListener('click', () => {
        if (ventaActual.length === 0) {
            mostrarError("No hay productos en la venta");
            return;
        }

        const totalFinal = ventaActual.reduce((acc, i) => acc + (parseFloat(i.producto['Precio Venta'] || 0) * i.cantidad), 0);
        totalACobrar.innerText = `Total: ${formatearPeso(totalFinal)}`;


        modalMetodoPago.classList.add('visible');
    });


    cerrarModalPago.addEventListener('click', () => {
        modalMetodoPago.classList.remove('visible');
    });


    modalMetodoPago.addEventListener('click', (e) => {
        if (e.target === modalMetodoPago) {
            modalMetodoPago.classList.remove('visible');
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
                    modalConfirmacion.classList.add('visible');
                    
                    ventaActual = [];
                    actualizar();
                    modalMetodoPago.classList.remove('visible');
                } else {
                    const err = await res.json().catch(()=>({}));
                    mostrarError(err.error || 'Error desconocido al procesar la venta');
                    modalMetodoPago.classList.remove('visible');
                }
            } catch (e) {
                mostrarError('Error de conexión con el servidor');
                modalMetodoPago.classList.remove('visible');
            }
        });
    });

    // Cerrar modal de confirmación
    const btnCerrarConfirmacion = document.getElementById('btn-cerrar-confirmacion');
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    
    btnCerrarConfirmacion.addEventListener('click', () => {
        modalConfirmacion.classList.remove('visible');
        escaner.focus();
    });
    
    modalConfirmacion.addEventListener('click', (e) => {
        if (e.target === modalConfirmacion) {
            modalConfirmacion.classList.remove('visible');
            escaner.focus();
        }
    });

    // Función para mostrar modal de error
    function mostrarError(mensaje) {
        const modalError = document.getElementById('modal-error');
        const mensajeError = document.getElementById('mensaje-error');
        mensajeError.textContent = mensaje;
        modalError.classList.add('visible');
    }

    // Cerrar modal de error
    const btnCerrarError = document.getElementById('btn-cerrar-error');
    const modalError = document.getElementById('modal-error');
    
    btnCerrarError.addEventListener('click', () => {
        modalError.classList.remove('visible');
        escaner.focus();
    });
    
    modalError.addEventListener('click', (e) => {
        if (e.target === modalError) {
            modalError.classList.remove('visible');
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