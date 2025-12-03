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
            if (!res.ok) throw new Error("No encontrado");
            const prod = await res.json();

            const existe = ventaActual.find(i => i.sku === (prod.id_sku_en_db || sku));
            if (existe) existe.cantidad++;
            else ventaActual.push({ sku: prod.id_sku_en_db || sku, producto: prod, cantidad: 1 });

            actualizar();
            escaner.value = ''; escaner.focus();
        } catch (e) { alert(e.message); escaner.select(); }
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
                const res = await fetch(`${API_URL}/ventas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email_usuario: usuario.email,
                        items: ventaActual,
                        total: totalFinal,
                        metodo_pago: metodoPago,
                        estado: 'completada'
                    })
                });

                if (res.ok) {
                    alert(`Venta procesada con ${btn.textContent.trim()}`);
                    ventaActual = [];
                    actualizar();
                    modalMetodoPago.style.display = 'none';
                    escaner.focus();
                } else {
                    alert("Error al procesar la venta");
                }
            } catch (e) {
                alert("Error de conexión");
            }
        });
    });
}