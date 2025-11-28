// ==========================================
// TPV.JS - VERSIÓN FINAL CORREGIDA
// ==========================================

const API_URL = 'http://localhost:8000'; 

function formatearPesoChileno(numero) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(numero);
}

// Esperamos a que cargue todo el contenido
window.onload = function() {
    console.log("=== SISTEMA TPV INICIADO ===");

    // ----------------------------------------------------
    // 1. SEGURIDAD Y SESIÓN (Esto va primero)
    // ----------------------------------------------------
    const usuarioJSON = sessionStorage.getItem('usuarioLogueado');
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;

    if (!usuario) {
        window.location.href = 'index.html';
        return;
    }

    // EVENTO CERRAR SESIÓN (Prioritario)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("¿Seguro que deseas salir?")) {
                sessionStorage.removeItem('usuarioLogueado');
                window.location.href = 'index.html';
            }
        });
    }

    // ----------------------------------------------------
    // 2. CONFIGURACIÓN DE ROLES (Admin vs Vendedor)
    // ----------------------------------------------------
    let rol = (usuario.rol || usuario.role || 'vendedor').toString().toLowerCase().trim();
    const esAdmin = (rol === 'admin' || rol === 'administrador');

    console.log("Rol detectado:", rol);

    // Referencias a los botones de Admin
    const btnReportes = document.getElementById('btn-reportes');
    const btnVerProductos = document.getElementById('btn-usuarios'); // Este es tu botón "Ver productos"
    const tituloAdmin = document.querySelector('.titulo-admin');

    // Mostrar u ocultar botones según el rol
    if (esAdmin) {
        if(btnReportes) btnReportes.style.display = 'block';
        if(btnVerProductos) btnVerProductos.style.display = 'block';
        if(tituloAdmin) tituloAdmin.style.display = 'block';
    } else {
        if(btnReportes) btnReportes.style.display = 'none';
        if(btnVerProductos) btnVerProductos.style.display = 'none';
        if(tituloAdmin) tituloAdmin.style.display = 'none';
    }

    // Actualizar textos de bienvenida
    const bienvenida = document.getElementById('bienvenida-usuario');
    const rolTxt = document.getElementById('rol-usuario');
    if (bienvenida) bienvenida.innerText = `Hola, ${usuario.nombre || usuario.email}`;
    if (rolTxt) rolTxt.innerText = esAdmin ? "ADMINISTRADOR" : "VENDEDOR";


    // ----------------------------------------------------
    // 3. LOGICA DEL MODAL "VER PRODUCTOS" (Aquí estaba el fallo)
    // ----------------------------------------------------
    const modal = document.getElementById('modal-editar-producto');
    const btnCerrarModal = document.getElementById('modal-cerrar');
    
    // Inputs del Modal
    const inputSkuModal = document.getElementById('modal-sku-input');
    const btnBuscarModal = document.getElementById('modal-buscar-sku');
    const formEditar = document.getElementById('modal-form-editar');

    // ABRIR MODAL
    if (btnVerProductos) {
        btnVerProductos.addEventListener('click', () => {
            console.log("Abriendo modal de productos...");
            if(modal) {
                modal.style.display = 'flex'; // Muestra la ventana
                inputSkuModal.value = '';
                inputSkuModal.focus();
                
                // Ocultar formulario hasta que se busque algo
                if(formEditar) formEditar.style.display = 'none';
            } else {
                alert("Error: No se encuentra el modal en el HTML");
            }
        });
    }

    // CERRAR MODAL
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // BUSCAR DENTRO DEL MODAL
    if (btnBuscarModal) {
        btnBuscarModal.addEventListener('click', async () => {
            const sku = inputSkuModal.value.trim();
            if(!sku) return;

            try {
                // Buscamos el producto en la API
                const res = await fetch(`${API_URL}/productos/${encodeURIComponent(sku)}`);
                if(!res.ok) throw new Error("Producto no encontrado");
                const prod = await res.json();

                // Llenamos los campos (Usando tus IDs del HTML)
                document.getElementById('modal-titulo-producto').innerText = prod.Titulo || prod.titulo || 'Sin Título';
                document.getElementById('modal-precio').value = prod['Precio Venta'] || prod.precio || 0;
                document.getElementById('modal-stock').value = prod.Stock || prod.stock || 0;
                document.getElementById('modal-variantes').value = prod.Variantes || prod.variantes || '';
                
                // Mostramos el formulario
                formEditar.style.display = 'block';

                // AGREGAR BOTÓN GUARDAR (Si no existe, lo creamos)
                let btnGuardar = document.getElementById('btn-guardar-dinamico');
                if (!btnGuardar) {
                    btnGuardar = document.createElement('button');
                    btnGuardar.id = 'btn-guardar-dinamico';
                    btnGuardar.innerText = "💾 Guardar Cambios";
                    btnGuardar.className = "accion-btn";
                    btnGuardar.style.marginTop = "15px";
                    btnGuardar.style.width = "100%";
                    btnGuardar.style.backgroundColor = "#28a745"; // Verde
                    btnGuardar.style.color = "white";
                    
                    // Lo agregamos al final del formulario
                    formEditar.appendChild(btnGuardar);
                    
                    // Evento Guardar
                    btnGuardar.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await guardarCambiosProducto(sku);
                    });
                }

            } catch (e) {
                alert(e.message);
                if(formEditar) formEditar.style.display = 'none';
            }
        });
    }

    // FUNCIÓN GUARDAR CAMBIOS
    async function guardarCambiosProducto(skuOriginal) {
        const stockInput = document.getElementById('modal-stock');
        const precioInput = document.getElementById('modal-precio');
        const variantesInput = document.getElementById('modal-variantes');

        const datosUpdate = {
            sku: skuOriginal,
            nuevo_stock: parseInt(stockInput.value),
            precio: parseInt(precioInput.value),
            variantes: variantesInput.value,
            usuario: usuario.email
        };

        try {
            const res = await fetch(`${API_URL}/productos`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datosUpdate)
            });

            if(res.ok) {
                alert("✅ Producto actualizado correctamente");
                modal.style.display = 'none';
            } else {
                alert("Error al actualizar");
            }
        } catch(e) { 
            alert("Error de conexión con el servidor"); 
        }
    }
    // =========================================================
    // 7. LÓGICA DE REPORTES (NUEVO)
    // =========================================================
    
    const modalReportes = document.getElementById('modal-reportes');
    const btnCerrarReportes = document.getElementById('modal-reportes-cerrar');
    const btnGenerarReporte = document.getElementById('btn-generar-reporte');
    const tablaCuerpo = document.getElementById('cuerpo-tabla-reportes');

    // ABRIR MODAL
    if (btnReportes) { // btnReportes ya lo definimos arriba al chequear roles
        btnReportes.addEventListener('click', () => {
            if(modalReportes) {
                modalReportes.style.display = 'flex';
                // Poner fechas por defecto (Hoy)
                const hoy = new Date().toISOString().split('T')[0];
                document.getElementById('fecha-inicio').value = hoy;
                document.getElementById('fecha-fin').value = hoy;
            }
        });
    }

    // CERRAR MODAL
    if (btnCerrarReportes) {
        btnCerrarReportes.addEventListener('click', () => {
            modalReportes.style.display = 'none';
        });
    }

    // GENERAR CONSULTA
    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', async () => {
            const inicio = document.getElementById('fecha-inicio').value;
            const fin = document.getElementById('fecha-fin').value;

            if(!inicio || !fin) return alert("Selecciona ambas fechas");

            btnGenerarReporte.disabled = true;
            btnGenerarReporte.innerText = "Cargando...";
            tablaCuerpo.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando datos...</td></tr>';

            try {
                // Llamamos a Reportes.php (ruta definida en index.php)
                const url = `${API_URL}/reportes/ventas?inicio=${inicio}&fin=${fin}`;
                const res = await fetch(url);
                
                if(!res.ok) throw new Error("Error al consultar reporte");
                
                const datos = await res.json();
                
                // Renderizar Resumen
                document.getElementById('resumen-reporte').style.display = 'flex';
                document.getElementById('txt-total-ventas').innerText = formatearPesoChileno(datos.total_monto || 0);
                document.getElementById('txt-cantidad-ventas').innerText = datos.cantidad_ventas || 0;

                // Renderizar Tabla
                tablaCuerpo.innerHTML = '';
                
                if (datos.ventas && datos.ventas.length > 0) {
                    datos.ventas.forEach(venta => {
                        // Formatear fecha
                        const fecha = new Date(venta.fecha).toLocaleString();
                        const total = formatearPesoChileno(venta.total);
                        
                        const fila = `
                            <tr>
                                <td><small>${venta.id_venta || 'N/A'}</small></td>
                                <td>${fecha}</td>
                                <td>${venta.email_usuario || 'Anónimo'}</td>
                                <td style="text-align:right; font-weight:bold;">${total}</td>
                            </tr>
                        `;
                        tablaCuerpo.innerHTML += fila;
                    });
                } else {
                    tablaCuerpo.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay ventas en este rango de fechas.</td></tr>';
                }

            } catch (e) {
                console.error(e);
                alert("Error: " + e.message);
                tablaCuerpo.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error de conexión</td></tr>';
            } finally {
                btnGenerarReporte.disabled = false;
                btnGenerarReporte.innerText = "🔍 Consultar";
            }
        });
    }

    // ----------------------------------------------------
    // 4. INICIAR EL RESTO DEL SISTEMA (Ventas, Carrito)
    // ----------------------------------------------------
    iniciarSistemaVentas(usuario);
};

// Función separada para la venta (Para mantener orden)
function iniciarSistemaVentas(usuario) {
    let ventaActual = [];
    
    const escanerInput = document.getElementById('escaner-sku');
    const listaElement = document.getElementById('lista-productos-escaneados');
    const totalElement = document.getElementById('venta-total');

    // ESCANER
    if (escanerInput) {
        escanerInput.focus();
        escanerInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const sku = escanerInput.value.trim();
                if (sku) await buscarProductoVenta(sku);
            }
        });
    }

    // BOTONES LATERALES
    document.getElementById('btn-cobrar')?.addEventListener('click', procesarCobro);
    
    document.getElementById('btn-buscar')?.addEventListener('click', () => {
        // Tu botón "Cantidad a agregar"
        if (ventaActual.length === 0) return alert("Carrito vacío.");
        const cant = prompt("Ingresa cantidad:");
        if (cant > 0) {
            ventaActual[ventaActual.length - 1].cantidad = parseInt(cant);
            actualizarPantalla();
        }
    });

    document.getElementById('btn-producto')?.addEventListener('click', () => {
        // Tu botón "Eliminar último"
        if (ventaActual.length > 0) {
            ventaActual.pop(); // Borra el último
            actualizarPantalla();
        }
    });

    document.getElementById('btn-cancelar')?.addEventListener('click', () => {
        // Tu botón "Limpiar Carrito"
        if(confirm("¿Limpiar todo?")) {
            ventaActual = [];
            actualizarPantalla();
        }
    });

    // FUNCIONES AUXILIARES DE VENTA
    async function buscarProductoVenta(sku) {
        escanerInput.disabled = true;
        try {
            const res = await fetch(`${API_URL}/productos/${encodeURIComponent(sku)}`);
            if(!res.ok) throw new Error("No encontrado");
            const prod = await res.json();
            
            // Agregar al carrito
            const existe = ventaActual.find(i => i.sku === (prod.id_sku_en_db || sku));
            if(existe) existe.cantidad++;
            else ventaActual.push({ sku: prod.id_sku_en_db || sku, producto: prod, cantidad: 1 });
            
            actualizarPantalla();
            escanerInput.value = '';
            escanerInput.focus();
        } catch(e) { alert(e.message); escanerInput.select(); } 
        finally { escanerInput.disabled = false; escanerInput.focus(); }
    }

    function actualizarPantalla() {
        listaElement.innerHTML = '';
        let total = 0;
        ventaActual.forEach(item => {
            const p = parseFloat(item.producto['Precio Venta'] || 0);
            total += p * item.cantidad;
            listaElement.innerHTML += `<div class="item-producto"><strong>${item.producto.Titulo}</strong> x${item.cantidad} - $${p*item.cantidad}</div>`;
        });
        totalElement.innerText = "$" + total;
    }

    async function procesarCobro() {
        if(ventaActual.length === 0) return alert("Nada que cobrar");
        if(!confirm("¿Procesar venta?")) return;
        
        // Aquí iría tu lógica de POST a /ventas (igual que antes)
        alert("Simulando cobro... (Implementa el fetch aquí si lo necesitas)");
        ventaActual = [];
        actualizarPantalla();
    }
}