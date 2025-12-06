// ==========================================================
// DASHBOARD.JS - VERSIÓN MAESTRA FINAL (TODO INCLUIDO)
// ==========================================================
const API_URL = 'http://localhost:8000';
const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

function formatCLP(num) {
    try {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(num) || 0);
    } catch (e) {
        return '$' + (Number(num) || 0).toLocaleString('es-CL');
    }
}

if (!usuarioLogueado) window.location.href = '../index.html';
if ((usuarioLogueado.rol || usuarioLogueado.role || '').toLowerCase() !== 'admin') { 
    alert("Acceso restringido."); window.location.href='../Ventas/'; 
}

document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    sessionStorage.removeItem('usuarioLogueado'); window.location.href='../index.html';
});

window.cerrarModal = function(id) { 
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Cerrar modales haciendo click en el overlay (fondo oscuro)
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal(modal.id);
        }
    });
});

// Cerrar modales con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modalsVisibles = document.querySelectorAll('.modal-overlay[style*="display: flex"]');
        modalsVisibles.forEach(modal => {
            cerrarModal(modal.id);
        });
    }
});

// Función para mostrar modal de éxito
function mostrarExito(mensaje) {
    const modal = document.getElementById('modal-exito');
    const mensajeP = document.getElementById('mensaje-exito');
    mensajeP.textContent = mensaje;
    modal.style.display = 'flex';
}

document.getElementById('btn-cerrar-exito')?.addEventListener('click', function() {
    document.getElementById('modal-exito').style.display = 'none';
});

// Función para mostrar modal de confirmación
function mostrarConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirmacion');
        const mensajeP = document.getElementById('mensaje-confirmacion');
        const btnConfirmar = document.getElementById('btn-confirmar-accion');
        const btnCancelar = document.getElementById('btn-cancelar-confirmacion');
        
        mensajeP.textContent = mensaje;
        modal.style.display = 'flex';
        
        const confirmar = () => {
            modal.style.display = 'none';
            btnConfirmar.removeEventListener('click', confirmar);
            btnCancelar.removeEventListener('click', cancelar);
            resolve(true);
        };
        
        const cancelar = () => {
            modal.style.display = 'none';
            btnConfirmar.removeEventListener('click', confirmar);
            btnCancelar.removeEventListener('click', cancelar);
            resolve(false);
        };
        
        btnConfirmar.addEventListener('click', confirmar);
        btnCancelar.addEventListener('click', cancelar);
    });
}

// Función para mostrar notificación toast temporal
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let cargadoNotif = false;
window.verSeccion = function(id) {
    const tabs = ['home', 'prod', 'rep', 'users', 'prov', 'notif'];
    
    const bellBtn = document.getElementById('btn-notif-bell');
    if (bellBtn) {
        bellBtn.style.background = 'none';
        bellBtn.style.color = (id === 'notif') ? '#122028' : '#29542e';
    }
    tabs.forEach(t => {
        const sec = document.getElementById('sec-' + t);
        const nav = document.getElementById('nav-' + t);
        if(sec) sec.classList.remove('active');
        if(nav) nav.classList.remove('active');
    });

    const sec = document.getElementById('sec-' + id);
    const nav = document.getElementById('nav-' + id);
    if(sec) sec.classList.add('active');
    if(nav) nav.classList.add('active');

    const btnFlotante = document.querySelector('.btn-flotante');
    if(btnFlotante) {
        if(id === 'prod') {
            btnFlotante.classList.add('visible');
        } else {
            btnFlotante.classList.remove('visible');
        }
    }

    if(id === 'home') cargarResumenDashboard();
    if(id === 'prod') cargarMovimientos();
    if(id === 'users') cargarUsuarios();
    if(id === 'prov') cargarProveedores();
    if(id === 'notif' && !cargadoNotif) { cargadoNotif = true; cargarNotificaciones(); }
};


// ==========================================
// 3. DASHBOARD INICIO (GRÁFICOS)
// ==========================================
let miGrafico = null; 
let ventasMetodosCache = { entries: [], total: 0 };
async function cargarResumenDashboard() {
    try {
        const res = await fetch(`${API_URL}/reportes?tipo=dashboard`);
        const data = await res.json();

        document.getElementById('kpi-top-prod').innerText = data.top_producto || 'Sin ventas';
        document.getElementById('kpi-valor-inv').innerText = formatCLP(data.valor_inventario || 0);

        const ctx = document.getElementById('graficoVentas').getContext('2d');
        const etiquetas = Object.keys(data.ventas_mes); 
        const valores = Object.values(data.ventas_mes); 

        if (miGrafico) miGrafico.destroy();

        miGrafico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Ventas Totales ($)',
                    data: valores,
                    backgroundColor: 'rgba(41, 84, 46, 0.6)', 
                    borderColor: '#29542e',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Render ranking de ventas por método de pago
        const contMetodos = document.getElementById('lista-metodos-pago');
        const btnVerMetodos = document.getElementById('btn-ver-metodos-pago');
        if (contMetodos) {
            contMetodos.innerHTML = '';
            const metodos = data.ventas_por_metodo || {};
            const entries = Object.entries(metodos).sort((a, b) => (b[1] || 0) - (a[1] || 0));
            const totalVentas = entries.reduce((acc, [, cant]) => acc + (Number(cant) || 0), 0);

            ventasMetodosCache = { entries, total: totalVentas };

            if (btnVerMetodos) {
                btnVerMetodos.style.display = 'inline-flex';
                btnVerMetodos.textContent = `Ver todo (${totalVentas} venta${totalVentas === 1 ? '' : 's'})`;
                btnVerMetodos.disabled = totalVentas === 0;
                btnVerMetodos.style.opacity = totalVentas === 0 ? '0.6' : '1';
                btnVerMetodos.onclick = () => {
                    if (totalVentas === 0) return;
                    abrirModalMetodosPago();
                };
            }

            const topEntries = entries.slice(0, 3);

            if (topEntries.length === 0) {
                contMetodos.innerHTML = '<div style="color:#7f8c8d;">No hay ventas registradas</div>';
            } else {
                topEntries.forEach(([nombre, cantidad], idx) => {
                    const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•';
                    const card = document.createElement('div');
                    card.style.cssText = 'background:#f8faf8; border:1px solid #e0e6e0; border-radius:10px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.04);';
                    const left = document.createElement('div');
                    left.style.cssText = 'display:flex; align-items:center; gap:10px; color:#122028; font-weight:600;';
                    left.innerHTML = `<span style="font-size:1.1rem;">${badge}</span> <span>${nombre}</span>`;
                    const right = document.createElement('div');
                    right.style.cssText = 'color:#29542e; font-weight:bold; font-size:1rem;';
                    right.textContent = `${cantidad} venta${cantidad === 1 ? '' : 's'}`;
                    card.appendChild(left);
                    card.appendChild(right);
                    contMetodos.appendChild(card);
                });
            }
        }
    } catch (e) { console.error("Error dashboard:", e); }
}

function abrirModalMetodosPago() {
    const modal = document.getElementById('modal-metodos-pago');
    const lista = document.getElementById('modal-metodos-lista');
    const resumen = document.getElementById('modal-metodos-resumen');
    const resumenBox = document.getElementById('modal-metodos-totales');
    if (!modal || !lista || !resumen) return;

    const { entries, total } = ventasMetodosCache;
    resumen.textContent = `Total ventas registradas: ${total}`;
    if (resumenBox) {
        const totalMetodos = entries?.length || 0;
        resumenBox.textContent = `${total} venta${total === 1 ? '' : 's'} • ${totalMetodos} método${totalMetodos === 1 ? '' : 's'}`;
    }
    lista.innerHTML = '';

    if (!entries || entries.length === 0) {
        lista.innerHTML = '<div style="color:#7f8c8d;">No hay ventas registradas</div>';
    } else {
        entries.forEach(([nombre, cantidad]) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#ffffff; border:1px solid #e8eeea; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04);';
            const left = document.createElement('div');
            left.style.cssText = 'color:#122028; font-weight:600;';
            left.textContent = nombre;
            const right = document.createElement('div');
            right.style.cssText = 'color:#29542e; font-weight:bold;';
            right.textContent = `${cantidad} venta${cantidad === 1 ? '' : 's'}`;
            row.appendChild(left);
            row.appendChild(right);
            lista.appendChild(row);
        });
    }

    modal.style.display = 'flex';
}
cargarResumenDashboard();
cargarBadgeNotificaciones();


// ==========================================
// 4. BITÁCORA DE MOVIMIENTOS
// ==========================================
let movimientosData = [];
let movimientosDataFiltrados = [];
let movimientosPaginaActual = 1;
const MOVS_POR_PAGINA = 10;
let skuFiltroActual = null;
let ordenActual = { columna: 'fecha', direccion: 'desc' };

// Función para aplicar filtros
function aplicarFiltrosMovimientos() {
    const filtroTipo = document.getElementById('filtro-tipo')?.value.toLowerCase();
    const filtroUsuario = document.getElementById('filtro-usuario')?.value.toLowerCase();
    const filtroFechaInicio = document.getElementById('filtro-fecha-inicio')?.value;
    const filtroFechaFin = document.getElementById('filtro-fecha-fin')?.value;
    
    movimientosDataFiltrados = movimientosData.filter(m => {
        // Filtro por tipo
        if (filtroTipo && !m.tipo?.toLowerCase().includes(filtroTipo)) return false;
        
        // Filtro por usuario
        if (filtroUsuario && !m.usuario?.toLowerCase().includes(filtroUsuario)) return false;
        
        // Filtro por fecha inicio
        if (filtroFechaInicio) {
            const fechaMovimiento = new Date(m.fecha).setHours(0,0,0,0);
            const fechaInicio = new Date(filtroFechaInicio).setHours(0,0,0,0);
            if (fechaMovimiento < fechaInicio) return false;
        }
        
        // Filtro por fecha fin
        if (filtroFechaFin) {
            const fechaMovimiento = new Date(m.fecha).setHours(0,0,0,0);
            const fechaFin = new Date(filtroFechaFin).setHours(0,0,0,0);
            if (fechaMovimiento > fechaFin) return false;
        }
        
        return true;
    });
    
    movimientosPaginaActual = 1;
    renderMovimientosPage();
}

// Función para ordenar movimientos
window.ordenarMovimientos = function(columna) {
    // Actualizar dirección de ordenamiento
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }
    
    // Actualizar indicadores visuales
    ['fecha', 'producto', 'tipo', 'usuario'].forEach(col => {
        const span = document.getElementById(`sort-${col}`);
        if (span) {
            if (col === columna) {
                span.textContent = ordenActual.direccion === 'asc' ? '↑' : '↓';
                span.style.color = '#29542e';
            } else {
                span.textContent = '⇅';
                span.style.color = '#999';
            }
        }
    });
    
    // Ordenar los datos
    const dataOrdenar = movimientosDataFiltrados.length > 0 ? movimientosDataFiltrados : movimientosData;
    
    dataOrdenar.sort((a, b) => {
        let valorA, valorB;
        
        switch(columna) {
            case 'fecha':
                valorA = new Date(a.fecha).getTime();
                valorB = new Date(b.fecha).getTime();
                break;
            case 'producto':
                valorA = (a.sku || '').toLowerCase();
                valorB = (b.sku || '').toLowerCase();
                break;
            case 'tipo':
                valorA = (a.tipo || '').toLowerCase();
                valorB = (b.tipo || '').toLowerCase();
                break;
            case 'usuario':
                valorA = (a.usuario || '').toLowerCase();
                valorB = (b.usuario || '').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (valorA < valorB) return ordenActual.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenActual.direccion === 'asc' ? 1 : -1;
        return 0;
    });
    
    if (movimientosDataFiltrados.length > 0) {
        movimientosDataFiltrados = [...dataOrdenar];
    } else {
        movimientosData = [...dataOrdenar];
    }
    
    renderMovimientosPage();
};

async function cargarMovimientos(skuFiltro = null, page = 1) {
    const tbody = document.getElementById('tabla-mov-body');
    const infoDiv = document.getElementById('info-producto');
    const paginador = document.getElementById('mov-paginador');
    const paginadorTop = document.getElementById('mov-paginador-top');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" align="center">Cargando...</td></tr>';
    skuFiltroActual = skuFiltro;
    movimientosPaginaActual = page || 1;

    try {
        if (skuFiltro) {
            const resProd = await fetch(`${API_URL}/productos/${encodeURIComponent(skuFiltro)}`);
            if (resProd.ok) {
                const prod = await resProd.json();
                infoDiv.style.display = 'block';
                document.getElementById('lbl-titulo').innerText = `${prod.Titulo} (${prod.id_sku_en_db})`;
                document.getElementById('lbl-stock').innerText = prod.Stock || 0;
                document.getElementById('lbl-precio').innerText = formatCLP(prod['Precio Venta'] || 0);
            }
        } else {
            if(infoDiv) infoDiv.style.display = 'none';
        }

        let url = `${API_URL}/movimientos` + (skuFiltro ? `?sku=${encodeURIComponent(skuFiltro)}` : '');
        const resMov = await fetch(url);
        movimientosData = await resMov.json();
        movimientosDataFiltrados = [];

        tbody.innerHTML = '';
        if (!Array.isArray(movimientosData) || movimientosData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" align="center">No hay movimientos.</td></tr>';
            if (paginador) paginador.style.display = 'none';
            if (paginadorTop) paginadorTop.style.display = 'none';
            return;
        }

        renderMovimientosPage();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red">${e.message}</td></tr>`;
        if (paginador) paginador.style.display = 'none';
        if (paginadorTop) paginadorTop.style.display = 'none';
    }
}

function renderMovimientosPage() {
    const tbody = document.getElementById('tabla-mov-body');
    const dataRender = movimientosDataFiltrados.length > 0 ? movimientosDataFiltrados : movimientosData;
    const total = dataRender.length;
    const totalPages = Math.ceil(total / MOVS_POR_PAGINA) || 1;
    if (movimientosPaginaActual > totalPages) movimientosPaginaActual = totalPages;
    const start = (movimientosPaginaActual - 1) * MOVS_POR_PAGINA;
    const end = Math.min(start + MOVS_POR_PAGINA, total);
    const pageItems = dataRender.slice(start, end);

    tbody.innerHTML = '';
    pageItems.forEach(m => {
        let color = '#95a5a6';
        let tipo = (m.tipo || '').toLowerCase();
        if(tipo.includes('entrada')) color = '#27ae60';
        if(tipo.includes('salida') || tipo.includes('venta')) color = '#c0392b';
        if(tipo.includes('precio')) color = '#f39c12';
        if(tipo.includes('edicion')) color = '#3498db';

        let detalle = m.detalle || '-';
        if (m.proveedor && tipo.includes('entrada')) {
            detalle += `<br><span style="color:#27ae60; font-size:0.8rem;">🚚 ${m.proveedor}</span>`;
        }

        let btnEditRow = `<button onclick="abrirModalEditarProducto('${m.sku}')" style="border:none; background:none; cursor:pointer; font-size:1.2rem; padding:5px;" title="Editar">✏️</button>`;

        tbody.innerHTML += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; font-size:0.85rem; min-width:150px;">${new Date(m.fecha).toLocaleString()}</td>
                <td style="padding-left:20px;"><b>${m.sku}</b> ${btnEditRow}<br><small>${m.titulo}</small></td>
                <td style="text-align:center; min-width:120px;"><span style="background:${color}; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${tipo.toUpperCase()}</span></td>
                <td style="font-size:0.9rem; text-align:center;">${detalle}</td>
                <td style="font-size:0.85rem;">${m.usuario || 'Sistema'}</td>
            </tr>`;
    });

    renderMovimientosPager(totalPages);
}

function renderMovimientosPager(totalPages) {
    const paginador = document.getElementById('mov-paginador');
    const pageInfo = document.getElementById('mov-page-info');
    const btnPrev = document.getElementById('mov-prev');
    const btnNext = document.getElementById('mov-next');
    if (paginador && pageInfo && btnPrev && btnNext) {
        if (totalPages <= 1) { paginador.style.display = 'none'; }
        else {
            paginador.style.display = 'flex';
            pageInfo.textContent = `Página ${movimientosPaginaActual} de ${totalPages}`;
            btnPrev.disabled = movimientosPaginaActual <= 1;
            btnNext.disabled = movimientosPaginaActual >= totalPages;
            btnPrev.onclick = () => { if (movimientosPaginaActual > 1) { movimientosPaginaActual--; renderMovimientosPage(); } };
            btnNext.onclick = () => { if (movimientosPaginaActual < totalPages) { movimientosPaginaActual++; renderMovimientosPage(); } };
        }
    }

    const paginadorTop = document.getElementById('mov-paginador-top');
    const pageInfoTop = document.getElementById('mov-page-info-top');
    const btnPrevTop = document.getElementById('mov-prev-top');
    const btnNextTop = document.getElementById('mov-next-top');
    if (paginadorTop && pageInfoTop && btnPrevTop && btnNextTop) {
        if (totalPages <= 1) { paginadorTop.style.display = 'none'; }
        else {
            paginadorTop.style.display = 'flex';
            pageInfoTop.textContent = `Página ${movimientosPaginaActual} de ${totalPages}`;
            btnPrevTop.disabled = movimientosPaginaActual <= 1;
            btnNextTop.disabled = movimientosPaginaActual >= totalPages;
            btnPrevTop.onclick = () => { if (movimientosPaginaActual > 1) { movimientosPaginaActual--; renderMovimientosPage(); } };
            btnNextTop.onclick = () => { if (movimientosPaginaActual < totalPages) { movimientosPaginaActual++; renderMovimientosPage(); } };
        }
    }
}

document.getElementById('btn-buscar')?.addEventListener('click', () => {
    const sku = document.getElementById('sku-buscar').value.trim();
    if(sku) cargarMovimientos(sku, 1); else mostrarToast('⚠️ Ingresa un SKU para filtrar', 'warning');
});
document.getElementById('btn-ver-todos')?.addEventListener('click', () => {
    document.getElementById('sku-buscar').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-usuario').value = '';
    document.getElementById('filtro-fecha-inicio').value = '';
    document.getElementById('filtro-fecha-fin').value = '';
    cargarMovimientos(null, 1);
});

// Event listener para aplicar filtros
document.getElementById('btn-aplicar-filtros')?.addEventListener('click', () => {
    aplicarFiltrosMovimientos();
});

// Event listeners para aplicar filtros en tiempo real
document.getElementById('filtro-tipo')?.addEventListener('change', aplicarFiltrosMovimientos);
document.getElementById('filtro-usuario')?.addEventListener('input', () => {
    clearTimeout(window.filtroUsuarioTimeout);
    window.filtroUsuarioTimeout = setTimeout(aplicarFiltrosMovimientos, 500);
});
document.getElementById('filtro-fecha-inicio')?.addEventListener('change', aplicarFiltrosMovimientos);
document.getElementById('filtro-fecha-fin')?.addEventListener('change', aplicarFiltrosMovimientos);


// ==========================================
// 5. REPORTES VENTAS
// ==========================================
const btnReporte = document.getElementById('btn-reporte');
if (btnReporte) {
    btnReporte.addEventListener('click', async ()=>{
        const ini = document.getElementById('f-ini')?.value;
        const fin = document.getElementById('f-fin')?.value;
        if(!ini || !fin) {
            mostrarToast('⚠️ Selecciona las fechas de inicio y fin', 'warning');
            return;
        }
        document.getElementById('container-excel').style.display='none';

        try {
            const res = await fetch(`${API_URL}/reportes?inicio=${ini}&fin=${fin}`);
            const data = await res.json();

            document.getElementById('resumen').style.display='block';
            const totalCLP = formatCLP(parseInt(data.total_monto || 0));
            document.getElementById('txt-monto').innerText = totalCLP;

            // Guardar ventas para paginación y render inicial
            window.ventasData = Array.isArray(data.ventas) ? data.ventas : [];
            window.ventasPaginaActual = 1;
            window.VENTAS_POR_PAGINA = 10;

            renderReportePage();

            if (window.ventasData.length > 0) {
                document.getElementById('container-excel').style.display='block';
            }
        } catch(e) { console.error(e); }
    });
}

function renderReportePage() {
    const tbody = document.getElementById('tabla-rep');
    const total = window.ventasData.length;
    const totalPages = Math.ceil(total / window.VENTAS_POR_PAGINA) || 1;
    if (window.ventasPaginaActual > totalPages) window.ventasPaginaActual = totalPages;
    const start = (window.ventasPaginaActual - 1) * window.VENTAS_POR_PAGINA;
    const end = Math.min(start + window.VENTAS_POR_PAGINA, total);
    const pageItems = window.ventasData.slice(start, end);

    tbody.innerHTML = '';

    if (pageItems.length === 0) {
        tbody.innerHTML='<tr><td colspan="6" align="center">Sin ventas</td></tr>';
        renderReportePager(1);
        return;
    }

    pageItems.forEach(v => {
        const items = Array.isArray(v.items) ? v.items : [];
        let lista = items.map(i=>{
            let n = i.titulo||i.Titulo||(i.producto?i.producto.Titulo:null)||'Prod';
            return `• ${n} (x${i.cantidad})`;
        }).join('<br>');
        let pago = v.metodo_pago || '-';

        tbody.innerHTML += `
        <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px">${new Date(v.fecha).toLocaleString()}</td>
            <td><small>${(v.id_venta||'').toString().substr(0,8)}</small></td>
            <td>${v.email_usuario}</td>
            <td>${pago}</td>
            <td>${lista}</td>
            <td style="text-align:right"><b>${formatCLP(v.total)}</b></td>
        </tr>`;
    });

    renderReportePager(totalPages);
}

function renderReportePager(totalPages) {
    const paginador = document.getElementById('rep-paginador');
    const pageInfo = document.getElementById('rep-page-info');
    const btnPrev = document.getElementById('rep-prev');
    const btnNext = document.getElementById('rep-next');
    if (paginador && pageInfo && btnPrev && btnNext) {
        if (totalPages <= 1) { paginador.style.display = 'none'; }
        else {
            paginador.style.display = 'flex';
            pageInfo.textContent = `Página ${window.ventasPaginaActual} de ${totalPages}`;
            btnPrev.disabled = window.ventasPaginaActual <= 1;
            btnNext.disabled = window.ventasPaginaActual >= totalPages;
            btnPrev.onclick = () => { if (window.ventasPaginaActual > 1) { window.ventasPaginaActual--; renderReportePage(); } };
            btnNext.onclick = () => { if (window.ventasPaginaActual < totalPages) { window.ventasPaginaActual++; renderReportePage(); } };
        }
    }
    const paginadorTop = document.getElementById('rep-paginador-top');
    const pageInfoTop = document.getElementById('rep-page-info-top');
    const btnPrevTop = document.getElementById('rep-prev-top');
    const btnNextTop = document.getElementById('rep-next-top');
    if (paginadorTop && pageInfoTop && btnPrevTop && btnNextTop) {
        if (totalPages <= 1) { paginadorTop.style.display = 'none'; }
        else {
            paginadorTop.style.display = 'flex';
            pageInfoTop.textContent = `Página ${window.ventasPaginaActual} de ${totalPages}`;
            btnPrevTop.disabled = window.ventasPaginaActual <= 1;
            btnNextTop.disabled = window.ventasPaginaActual >= totalPages;
            btnPrevTop.onclick = () => { if (window.ventasPaginaActual > 1) { window.ventasPaginaActual--; renderReportePage(); } };
            btnNextTop.onclick = () => { if (window.ventasPaginaActual < totalPages) { window.ventasPaginaActual++; renderReportePage(); } };
        }
    }
}

const btnExcel = document.getElementById('btn-exportar-excel');
if(btnExcel) {
    btnExcel.onclick = async (e) => {
        e.preventDefault();
        const ini=document.getElementById('f-ini').value, fin=document.getElementById('f-fin').value;
        if(!ini||!fin) return;
        btnExcel.innerText="Descargando…"; btnExcel.disabled=true;
        
        try {
            const res = await fetch(`${API_URL}/reportes?inicio=${ini}&fin=${fin}`);
            const data = await res.json();
            if(!data.ventas?.length) { alert("Sin datos"); return; }

            const rows = data.ventas.map(v => {
                let items = Array.isArray(v.items) ? v.items : [];
                let det = items.map(i => {
                    let n = i.titulo||i.Titulo||(i.producto?i.producto.Titulo:''); 
                    return `${n} (x${i.cantidad})`;
                }).join(', ');
                return {
                    "ID": v.id_venta, "Fecha": v.fecha, "Vendedor": v.email_usuario,
                    "Pago": v.metodo_pago, "Productos": det, "Total": v.total
                };
            });
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{wch:20},{wch:20},{wch:20},{wch:10},{wch:40},{wch:10}];
            XLSX.utils.book_append_sheet(wb, ws, "Ventas");
            
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); 
            document.body.appendChild(a); a.href=url; a.download=`Reporte_${ini}.xlsx`; a.click();
            setTimeout(()=>{ document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 1000);

        } catch(e){ console.error(e); }
        finally { btnExcel.innerText="Descargar Excel"; btnExcel.disabled=false; }
    };
}


// ==========================================
// 6. USUARIOS
// ==========================================
async function cargarUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        const u = await res.json();
        tbody.innerHTML = ''; 
        u.forEach(x => {
            let rol = (x.rol||'vendedor').toLowerCase();
            let color = rol==='admin'?'red':'green';
            let btnEd = `<button class="btn-editar-tabla" onclick="abrirModalUsuario('${x.id_db}','${x.email}','${x.nombre||''}','${rol}')">✏️</button>`;
            let btnDel = `<button class="btn-editar-tabla" style="background:#c0392b;margin-left:5px" onclick="eliminarUsuario('${x.id_db}','${x.email}')">🗑️</button>`;
            tbody.innerHTML+=`<tr style="border-bottom:1px solid #eee"><td style="padding:10px">${x.nombre||'-'}</td><td>${x.email}</td><td><span style="background:${color};color:white;padding:3px;border-radius:4px">${rol}</span></td><td align="right">${btnEd} ${btnDel}</td></tr>`;
        });
    } catch(e){}
}
window.abrirModalUsuario = function(id, email, nombre, rol) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-email').value = email;
    document.getElementById('edit-user-nombre').value = nombre;
    document.getElementById('edit-user-rol').value = rol;
    document.getElementById('modal-editar-usuario').style.display = 'flex';
};
document.getElementById('btn-guardar-user')?.addEventListener('click', async () => {
    const data = { id_db: document.getElementById('edit-user-id').value, nombre: document.getElementById('edit-user-nombre').value, rol: document.getElementById('edit-user-rol').value };
    await fetch(`${API_URL}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    mostrarToast('✅ Usuario actualizado exitosamente', 'success');
    cerrarModal('modal-editar-usuario');
    cargarUsuarios();
});
window.eliminarUsuario = async function(id, email) {
    const confirmar = await mostrarConfirmacion(`¿Eliminar a ${email}?`);
    if (!confirmar) return;
    await fetch(`${API_URL}/usuarios?id=${id}`, { method:'DELETE' });
    mostrarExito('Usuario eliminado exitosamente');
    cargarUsuarios();
};

document.getElementById('btn-nuevo-user')?.addEventListener('click', () => {
    document.getElementById('modal-crear-usuario').style.display = 'flex';
    // Limpiar campos y error al abrir
    document.getElementById('new-user-nombre').value = '';
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-rol').value = 'vendedor';
    document.getElementById('new-user-pass').value = '';
    const errorDiv = document.getElementById('error-crear-usuario');
    if (errorDiv) errorDiv.style.display = 'none';
});
document.getElementById('btn-guardar-nuevo-user')?.addEventListener('click', async () => {
    const errorDiv = document.getElementById('error-crear-usuario');
    const nombre = document.getElementById('new-user-nombre').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const rol = document.getElementById('new-user-rol').value;
    const contrasena = document.getElementById('new-user-pass')?.value || null;
    
    if (!nombre || !email) {
        errorDiv.textContent = '❌ Nombre y Email son obligatorios';
        errorDiv.style.display = 'block';
        return;
    }
    if (!contrasena || contrasena.length < 6) {
        errorDiv.textContent = '❌ La contraseña es obligatoria y debe tener al menos 6 caracteres';
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    try {
        const payload = { nombre, email, rol, contrasena };
        const res = await fetch(`${API_URL}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if (!res.ok) {
            const e = await res.json();
            errorDiv.textContent = '❌ Error: ' + (e.error || 'No se pudo crear');
            errorDiv.style.display = 'block';
            return;
        }
        mostrarExito('Usuario creado exitosamente');
        cerrarModal('modal-crear-usuario');
        cargarUsuarios();
    } catch (e) {
        errorDiv.textContent = '❌ Error de conexión';
        errorDiv.style.display = 'block';
    }
});


// ==========================================
// 7. PROVEEDORES
// ==========================================
async function cargarProveedores() {
    const tbody = document.getElementById('tabla-prov-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/proveedores`);
        const p = await res.json();
        tbody.innerHTML = ''; 
        if(p.length===0) { tbody.innerHTML='<tr><td colspan="5">Sin datos</td></tr>'; return; }
        p.forEach(x => {
            let btnEd = `<button class="btn-editar-tabla" onclick="abrirModalProv('${x.id}','${x.nombre}','${x.contacto}','${x.telefono}','${x.email}','${x.categoria}')">✏️</button>`;
            let btnDel = `<button class="btn-editar-tabla" style="background:#c0392b;margin-left:5px" onclick="eliminarProveedor('${x.id}','${x.nombre}')">🗑️</button>`;
            tbody.innerHTML += `<tr style="background:white;box-shadow:0 2px 5px rgba(0,0,0,0.05);border-radius:8px"><td style="padding:15px"><b>${x.nombre}</b></td><td>${x.contacto||'-'}</td><td>📞 ${x.telefono}<br>✉️ ${x.email}</td><td>${x.categoria}</td><td align="right">${btnEd} ${btnDel}</td></tr>`;
        });
    } catch(e){}
}
window.abrirModalProv = function(id, nombre, contacto, tel, email, cat) {
    document.getElementById('edit-prov-id').value = id;
    document.getElementById('edit-prov-nombre').value = nombre;
    document.getElementById('edit-prov-contacto').value = contacto;
    document.getElementById('edit-prov-tel').value = tel;
    document.getElementById('edit-prov-email').value = email;
    document.getElementById('edit-prov-cat').value = cat;
    document.getElementById('modal-editar-prov').style.display = 'flex';
};
window.eliminarProveedor = async function(id, nombre) {
    const confirmar = await mostrarConfirmacion(`¿Eliminar a ${nombre}?`);
    if (!confirmar) return;

    await fetch(`${API_URL}/proveedores?id=${id}`, { method:'DELETE' });
    mostrarExito('Proveedor eliminado exitosamente');
    cargarProveedores();
};
document.getElementById('btn-guardar-prov')?.addEventListener('click', async () => {
    const data = { 
        id_prov: document.getElementById('edit-prov-id').value, 
        nombre: document.getElementById('edit-prov-nombre').value, 
        contacto: document.getElementById('edit-prov-contacto').value, 
        telefono: document.getElementById('edit-prov-tel').value.trim(), 
        email: document.getElementById('edit-prov-email').value.trim(), 
        categoria: document.getElementById('edit-prov-cat').value 
    };

    // Validar que exista al menos teléfono o email
    if (!data.telefono && !data.email) {
        mostrarToast('⚠️ Debes ingresar teléfono o email (al menos uno)', 'warning');
        return;
    }

    await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    mostrarToast('✅ Proveedor actualizado exitosamente', 'success');
    cerrarModal('modal-editar-prov');
    cargarProveedores();
});
document.getElementById('btn-nuevo-prov')?.addEventListener('click', () => { 
    document.getElementById('modal-crear-prov').style.display = 'flex';
    // Limpiar campos y error
    document.getElementById('new-prov-nombre').value = '';
    document.getElementById('new-prov-contacto').value = '';
    document.getElementById('new-prov-tel').value = '';
    document.getElementById('new-prov-email').value = '';
    document.getElementById('new-prov-cat').value = '';
    const errorDiv = document.getElementById('error-crear-prov');
    if (errorDiv) errorDiv.style.display = 'none';
});
document.getElementById('btn-guardar-nuevo-prov')?.addEventListener('click', async () => {
    const errorDiv = document.getElementById('error-crear-prov');
    const data = { 
        nombre: document.getElementById('new-prov-nombre').value.trim(), 
        contacto: document.getElementById('new-prov-contacto').value.trim(), 
        telefono: document.getElementById('new-prov-tel').value.trim(), 
        email: document.getElementById('new-prov-email').value.trim(), 
        categoria: document.getElementById('new-prov-cat').value.trim() 
    };
    
    if(!data.nombre) {
        errorDiv.textContent = '❌ El nombre de la empresa es obligatorio';
        errorDiv.style.display = 'block';
        return;
    }
    
    if(!data.contacto) {
        errorDiv.textContent = '❌ El contacto es obligatorio';
        errorDiv.style.display = 'block';
        return;
    }

    if(!data.categoria) {
        errorDiv.textContent = '❌ La categoría es obligatoria';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Validar que exista al menos teléfono o email
    if (!data.telefono && !data.email) {
        errorDiv.textContent = '❌ Debe ingresar teléfono o email (al menos uno)';
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    mostrarExito('Proveedor creado exitosamente');
    cerrarModal('modal-crear-prov');
    cargarProveedores();
});


// ==========================================
// 8. AUTO-SYNC CSV
// ==========================================
(async function autoSincronizarCSV() {
    console.log("🔄 Iniciando sincronización automática...");
    try {
        const res = await fetch(`${API_URL}/importar`); 
        const data = await res.json();
        if (data.procesados > 0) {
            console.log("✅ Datos Sync:", data);
            if(document.getElementById('sec-home').classList.contains('active')) cargarResumenDashboard();
            if(typeof cargarMovimientos === 'function') cargarMovimientos();
        }
    } catch (e) { console.warn("⚠️ Sync:", e); }
})();


// ==========================================
// 9. LÓGICA EDITAR PRODUCTO (ESTA ES LA QUE TE FALTABA)
// ==========================================
window.abrirModalEditarProducto = async function(sku) {
    try {
        const res = await fetch(`${API_URL}/productos/${encodeURIComponent(sku)}`);
        if(!res.ok) {
            alert(`Error: Producto no encontrado (${sku})`);
            return;
        }
        const p = await res.json();
        
        document.getElementById('edit-prod-sku').value = p.id_sku_en_db || sku; 
        document.getElementById('edit-prod-titulo').value = p.Titulo || p.titulo || '';
        document.getElementById('edit-prod-precio').value = p['Precio Venta'] || p.precio_venta || 0;
        document.getElementById('edit-prod-stock').value = p.Stock || p.stock || 0;
        document.getElementById('edit-prod-variante').value = p.variantes || '';
        document.getElementById('edit-prod-cat').value = p.categoria || '';
        document.getElementById('edit-prod-desc').value = p.descripcion || '';
        document.getElementById('edit-prod-estado').value = (p.estado || 'activo').toLowerCase();

        // Actualizar título del modal con el SKU
        const modalTitulo = document.getElementById('modal-editar-prod-titulo');
        if (modalTitulo) {
            modalTitulo.textContent = `✏️ ${p.id_sku_en_db || sku}`;
        }

        const modal = document.getElementById('modal-editar-prod');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            alert('Error: Modal no encontrado');
        }
    } catch(e) { 
        console.error("Error en abrirModalEditarProducto:", e);
        alert("Error: " + e.message);
    }
};

document.getElementById('btn-guardar-prod-edit')?.addEventListener('click', async () => {
    const data = {
        sku: document.getElementById('edit-prod-sku').value,
        titulo: document.getElementById('edit-prod-titulo').value,
        precio: document.getElementById('edit-prod-precio').value,
        nuevo_stock: document.getElementById('edit-prod-stock').value,
        variantes: document.getElementById('edit-prod-variante').value,
        categoria: document.getElementById('edit-prod-cat').value,
        descripcion: document.getElementById('edit-prod-desc').value,
        estado: document.getElementById('edit-prod-estado').value,
        usuario: usuarioLogueado.nombre || 'Admin Web'
    };
    try {
        const res = await fetch(`${API_URL}/productos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        const result = await res.json();
        if(res.ok) { 
            cerrarModal('modal-editar-prod'); 
            cargarMovimientos(); 
            mostrarExito(result.mensaje || 'Cambios registrados en bitácora');
        }
        else { alert("❌ " + result.error); }
    } catch(e) { alert("Error conexión"); }
});

// ==========================================
// 10. ACCIÓN BOTÓN FLOTANTE (+)
// ==========================================
window.accionBotonFlotante = function() {
    console.log('accionBotonFlotante() llamado');
    const modal = document.getElementById('modal-buscar-prod');
    if (!modal) {
        console.error('Modal no encontrado: modal-buscar-prod');
        return;
    }
    console.log('Mostrando modal...');
    modal.style.display = 'flex';
    
    // Enfocar en el input después de que el modal sea visible
    setTimeout(() => {
        const input = document.getElementById('buscar-prod-sku');
        console.log('Input encontrado:', !!input);
        if (input) {
            input.value = '';
            input.focus();
            console.log('Input enfocado');
        }
    }, 100);
};

// Event listener para búsqueda por SKU - esperar a que exista el botón
document.addEventListener('DOMContentLoaded', () => {
    const btnBuscarProd = document.getElementById('btn-buscar-prod-modal');
    const inputSku = document.getElementById('buscar-prod-sku');
    
    if (btnBuscarProd) {
        btnBuscarProd.addEventListener('click', () => {
            const sku = document.getElementById('buscar-prod-sku').value.trim();
            if (sku) {
                cerrarModal('modal-buscar-prod');
                abrirModalEditarProducto(sku);
            } else {
                mostrarToast('⚠️ Ingresa un SKU válido', 'warning');
            }
        });
    }
    
    if (inputSku) {
        inputSku.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const sku = inputSku.value.trim();
                if (sku) {
                    cerrarModal('modal-buscar-prod');
                    abrirModalEditarProducto(sku);
                } else {
                    mostrarToast('⚠️ Ingresa un SKU válido', 'warning');
                }
            }
        });
    }
});

// Fallback: si DOMContentLoaded ya pasó, registrar los listeners de todas formas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM cargado');
    });
} else {
    // DOM ya está listo
    const btnBuscarProd = document.getElementById('btn-buscar-prod-modal');
    const inputSku = document.getElementById('buscar-prod-sku');
    
    if (btnBuscarProd) {
        btnBuscarProd.addEventListener('click', () => {
            const sku = document.getElementById('buscar-prod-sku').value.trim();
            if (sku) {
                cerrarModal('modal-buscar-prod');
                abrirModalEditarProducto(sku);
            } else {
                mostrarToast('⚠️ Ingresa un SKU válido', 'warning');
            }
        });
    }
    
    if (inputSku) {
        inputSku.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const sku = inputSku.value.trim();
                if (sku) {
                    cerrarModal('modal-buscar-prod');
                    abrirModalEditarProducto(sku);
                } else {
                    mostrarToast('⚠️ Ingresa un SKU válido', 'warning');
                }
            }
        });
    }
}


// ==========================================
// 11. NOTIFICACIONES (PRODUCTOS +80 DÍAS)
// ==========================================
let notificacionesData = [];
let notificacionesPaginaActual = 1;
const notificacionesPorPagina = 16;
let ordenNotifActual = { columna: null, direccion: 'asc' };

async function cargarNotificaciones() {
    const tbody = document.getElementById('tabla-notif-body');
    const resumen = document.getElementById('notif-resumen');
    const countSpan = document.getElementById('notif-count');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/notificaciones`);
        const data = await res.json();
        notificacionesData = data.alertas || [];
        notificacionesPaginaActual = 1;
        
        if (notificacionesData.length > 0) {
            resumen.style.display = 'block';
            countSpan.innerText = data.total;
            renderizarNotificaciones();
        } else {
            resumen.style.display = 'none';
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#27ae60;">✅ Todos los productos tienen ventas recientes o cambios de precio recientes</td></tr>';
            document.getElementById('notif-paginacion').style.display = 'none';
        }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6" style="color:red;">${e.message}</td></tr>`; }
}

window.ordenarNotificaciones = function(columna) {
    // Actualizar dirección de ordenamiento
    if (ordenNotifActual.columna === columna) {
        ordenNotifActual.direccion = ordenNotifActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenNotifActual.columna = columna;
        ordenNotifActual.direccion = 'asc';
    }
    
    // Actualizar indicadores visuales
    ['sku', 'producto', 'stock', 'categoria', 'motivo'].forEach(col => {
        const span = document.getElementById(`sort-notif-${col}`);
        if (span) {
            if (col === columna) {
                span.textContent = ordenNotifActual.direccion === 'asc' ? '↑' : '↓';
                span.style.color = '#29542e';
            } else {
                span.textContent = '⇅';
                span.style.color = '#999';
            }
        }
    });
    
    // Ordenar los datos
    notificacionesData.sort((a, b) => {
        let valorA, valorB;
        
        switch(columna) {
            case 'sku':
                valorA = (a.sku || '').toLowerCase();
                valorB = (b.sku || '').toLowerCase();
                break;
            case 'producto':
                valorA = (a.titulo || '').toLowerCase();
                valorB = (b.titulo || '').toLowerCase();
                break;
            case 'stock':
                valorA = a.stock || 0;
                valorB = b.stock || 0;
                break;
            case 'categoria':
                valorA = (a.categoria || '').toLowerCase();
                valorB = (b.categoria || '').toLowerCase();
                break;
            case 'motivo':
                valorA = (a.motivo || '').toLowerCase();
                valorB = (b.motivo || '').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (valorA < valorB) return ordenNotifActual.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenNotifActual.direccion === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderizarNotificaciones();
};

function renderizarNotificaciones() {
    const tbody = document.getElementById('tabla-notif-body');
    const paginacionDiv = document.getElementById('notif-paginacion');
    const paginaInfo = document.getElementById('notif-pagina-info');
    
    tbody.innerHTML = '';
    
    // Calcular índices de paginación
    const inicio = (notificacionesPaginaActual - 1) * notificacionesPorPagina;
    const fin = inicio + notificacionesPorPagina;
    const paginaData = notificacionesData.slice(inicio, fin);
    const totalPaginas = Math.ceil(notificacionesData.length / notificacionesPorPagina);
    
    // Renderizar productos de la página actual
    paginaData.forEach(a => {
        // Determinar color según tipo de motivo
        let color, bgColor;
        
        if (a.tipo === 'stock_bajo') {
            color = '#c0392b';
            bgColor = '#ffebee';
        } else if (a.tipo === 'sin_ventas') {
            color = '#d68910';
            bgColor = '#fff8e1';
        } else {
            color = '#7f8c8d';
            bgColor = '#f5f5f5';
        }
        
        const btnEditar = `<button class="btn-editar-tabla" title="Editar Producto" onclick="abrirModalEditarProducto('${a.sku}')">✏️</button>`;
        const fechaFormato = a.ultima_entrada ? new Date(a.ultima_entrada).toLocaleDateString() : '-';
        const fechaCambioStock = a.ultimo_cambio_stock ? new Date(a.ultimo_cambio_stock).toLocaleDateString() : '-';
        
        // Columna Motivo sin emojis, con fondo de color y detalle
        const motivoHTML = `<span style="display:inline-block; padding:6px 12px; background:${bgColor}; border-radius:6px; border-left:3px solid ${color};"><b>${a.motivo}:</b> ${a.detalle}</span>`;
        
        tbody.innerHTML += `<tr style="border-bottom:1px solid #eee;"><td><b>${a.sku}</b></td><td>${a.titulo}</td><td>${a.stock}</td><td>${a.categoria||'-'}</td><td>${fechaFormato}</td><td>${fechaCambioStock}</td><td style="font-weight:500;">${motivoHTML}</td><td align="right">${btnEditar}</td></tr>`;
    });
    
    // Mostrar/ocultar controles de paginación
    if (totalPaginas > 1) {
        paginacionDiv.style.display = 'flex';
        paginaInfo.innerText = `Página ${notificacionesPaginaActual} de ${totalPaginas}`;
    } else {
        paginacionDiv.style.display = 'none';
    }
}

function cambiarPaginaNotif(direccion) {
    const totalPaginas = Math.ceil(notificacionesData.length / notificacionesPorPagina);
    notificacionesPaginaActual += direccion;
    
    // Limitar entre 1 y totalPaginas
    if (notificacionesPaginaActual < 1) notificacionesPaginaActual = 1;
    if (notificacionesPaginaActual > totalPaginas) notificacionesPaginaActual = totalPaginas;
    
    renderizarNotificaciones();
}

async function cargarBadgeNotificaciones() {
    try {
        const res = await fetch(`${API_URL}/notificaciones`);
        const data = await res.json();
        const badge = document.getElementById('badge-notif');
        if (data.total > 0) {
            badge.innerText = data.total;
            badge.style.display = 'inline-block';
            badge.classList.add('badge-pulse');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('badge-pulse');
        }
    } catch (e) { console.error('Error badge:', e); }
}
cargarBadgeNotificaciones();

// ==========================================================
// CIERRE DE CAJA
// ==========================================================
const btnCierreCaja = document.getElementById('btn-cierre-caja');
const modalCierreCaja = document.getElementById('modal-cierre-caja');
const btnCerrarModalCierre = document.getElementById('cerrar-modal-cierre');
const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');

btnCierreCaja.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/cierre-caja`);
        const data = await res.json();

        if (res.ok) {
            if (data.cierre_realizado) {
                alert('⚠️ El cierre de caja del día ya fue realizado.');
                return;
            }
            mostrarResumenCierre(data);
            modalCierreCaja.style.display = 'flex';
        } else {
            alert(data.error || 'Error al obtener resumen de cierre');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al obtener resumen');
    }
});

btnCerrarModalCierre.addEventListener('click', () => {
    modalCierreCaja.style.display = 'none';
});

modalCierreCaja.addEventListener('click', (e) => {
    if (e.target === modalCierreCaja) {
        modalCierreCaja.style.display = 'none';
    }
});

btnConfirmarCierre.addEventListener('click', async () => {
    const confirmar = await mostrarConfirmacion('¿Está seguro de realizar el cierre de caja? Esta acción cerrará el flujo de ventas del día y no se podrán realizar más ventas hasta mañana.');
    if (!confirmar) return;

    try {
        const res = await fetch(`${API_URL}/cierre-caja`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuarioLogueado.id
            })
        });

        const data = await res.json();

        if (res.ok) {
            mostrarExito('✅ Cierre de caja registrado correctamente. ⚠️ No se podrán realizar más ventas hoy.');
            modalCierreCaja.style.display = 'none';
            
            // Deshabilitar botón de cierre
            btnCierreCaja.disabled = true;
            btnCierreCaja.style.opacity = '0.5';
            btnCierreCaja.style.cursor = 'not-allowed';
        } else {
            mostrarToast(data.error || 'Error al registrar cierre de caja', 'warning');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión al registrar cierre', 'warning');
    }
});

function mostrarResumenCierre(data) {
    // Actualizar fecha y total general
    document.getElementById('fecha-cierre').textContent = `Fecha: ${formatearFecha(data.fecha)}`;
    document.getElementById('total-general-cierre').textContent = `$${data.total_general}`;

    // Renderizar resumen por método de pago
    const resumenMetodosDiv = document.getElementById('resumen-metodos-pago');
    resumenMetodosDiv.innerHTML = '';

    if (data.resumen_metodos && data.resumen_metodos.length > 0) {
        data.resumen_metodos.forEach(metodo => {
            const iconos = {
                'mercado_pago': '💳',
                'debito': '💳',
                'credito': '💳',
                'efectivo': '💵'
            };
            
            resumenMetodosDiv.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <span style="font-weight: 500;">
                        ${iconos[metodo.metodo_pago] || '💳'} ${metodo.nombre}
                        <span style="color: #888; font-size: 0.9rem;">(${metodo.cantidad_ventas} ventas)</span>
                    </span>
                    <span style="font-weight: bold; color: #29542e; font-size: 1.2rem;">$${metodo.total}</span>
                </div>
            `;
        });
    } else {
        resumenMetodosDiv.innerHTML = '<p style="color: #888; text-align: center;">No hay ventas registradas hoy</p>';
    }

    // Renderizar tabla de ventas
    const bodyVentas = document.getElementById('body-ventas-dia');
    bodyVentas.innerHTML = '';

    if (data.ventas && data.ventas.length > 0) {
        data.ventas.forEach((venta, index) => {
            let productosTexto = '';
            try {
                const productos = JSON.parse(venta.detalle_productos || '[]');
                productosTexto = productos.map(p => {
                    const nombre = p.titulo || p.producto?.titulo || p.nombre || 'Producto';
                    const cantidad = p.cantidad || 1;
                    return `${nombre} (x${cantidad})`;
                }).join(', ');
            } catch (e) {
                productosTexto = 'Productos varios';
            }
            
            const hora = new Date(venta.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            
            const nombresMetodos = {
                'mercado_pago': 'M. Pago',
                'debito': 'Débito',
                'credito': 'Crédito',
                'efectivo': 'Efectivo'
            };

            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';

            bodyVentas.innerHTML += `
                <tr style="border-bottom: 1px solid #e9ecef; background: ${bgColor};">
                    <td style="padding: 12px 15px; white-space: nowrap; font-weight: 500; color: #495057;">
                        ${hora}
                    </td>
                    <td style="padding: 12px 15px; color: #495057; line-height: 1.4;">
                        <div style="max-height: 40px; overflow: hidden; text-overflow: ellipsis;" title="${productosTexto}">
                            ${productosTexto}
                        </div>
                    </td>
                    <td style="padding: 12px 15px; text-align: center;">
                        <span style="background: #e3f2fd; padding: 5px 10px; border-radius: 5px; font-size: 0.85rem; font-weight: 500; color: #1976d2; white-space: nowrap;">
                            ${nombresMetodos[venta.metodo_pago] || venta.metodo_pago}
                        </span>
                    </td>
                    <td style="padding: 12px 15px; text-align: right; font-weight: 700; color: #29542e; white-space: nowrap; font-size: 1.05rem;">
                        ${formatCLP(venta.monto_total)}
                    </td>
                </tr>
            `;
        });
    } else {
        bodyVentas.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #999; font-style: italic;">No hay ventas registradas hoy</td></tr>';
    }
}

function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha).toLocaleDateString('es-CL', opciones);
}

// Verificar al cargar si ya se hizo cierre hoy
async function verificarEstadoCierre() {
    try {
        const res = await fetch(`${API_URL}/cierre-caja`);
        const data = await res.json();

        if (res.ok && data.cierre_realizado) {
            btnCierreCaja.disabled = true;
            btnCierreCaja.style.opacity = '0.5';
            btnCierreCaja.style.cursor = 'not-allowed';
            btnCierreCaja.title = 'El cierre de caja del día ya fue realizado';
        }
    } catch (error) {
        console.error('Error al verificar estado de cierre:', error);
    }
}
verificarEstadoCierre();

// ========== SINCRONIZACIÓN FIREBASE ==========
class SincronizacionFirebase {
    constructor() {
        this.cambios = [];
        this.paginaActual = 1;
        this.itemsPorPagina = 7;
        this.cargarEventListeners();
    }

    cargarEventListeners() {
        const btnActualizar = document.getElementById('btn-actualizar-base');
        const modalSync = document.getElementById('modal-sync-resultados');
        const btnCerrarSync = document.getElementById('btn-cerrar-sync-modal');
        const btnCerrarSyncFooter = document.getElementById('btn-cerrar-sync-modal-footer');
        const btnPrev = document.getElementById('btn-sync-prev');
        const btnNext = document.getElementById('btn-sync-next');

        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.iniciarSincronizacion());
        }

        if (modalSync) {
            modalSync.addEventListener('click', (e) => {
                if (e.target === modalSync) {
                    this.cerrarModal();
                }
            });
        }

        if (btnCerrarSync) btnCerrarSync.addEventListener('click', () => this.cerrarModal());
        if (btnCerrarSyncFooter) btnCerrarSyncFooter.addEventListener('click', () => this.cerrarModal());
        if (btnPrev) btnPrev.addEventListener('click', () => this.paginaAnterior());
        if (btnNext) btnNext.addEventListener('click', () => this.paginaSiguiente());
    }

    async iniciarSincronizacion() {
        const btnActualizar = document.getElementById('btn-actualizar-base');
        const textoOriginal = btnActualizar.innerHTML;

        try {
            btnActualizar.disabled = true;
            btnActualizar.innerHTML = '⏳ Sincronizando...';

            const res = await fetch(`${API_URL}/sincronizar-firebase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();

            if (res.ok) {
                this.cambios = data.cambios || [];
                this.paginaActual = 1;
                
                if (data.total_cambios > 0) {
                    // Hay cambios: mostrar modal con detalles
                    this.mostrarModal();
                    this.renderizarPagina();
                    mostrarExito('Sincronización completada', `Se procesaron ${data.total_cambios} cambios`);
                } else {
                    // No hay cambios: solo mostrar toast informativo
                    mostrarToast(data.mensaje || 'Base de datos ya está actualizada', 'info');
                }
            } else {
                mostrarToast(data.error || 'Error en la sincronización', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarToast('Error de conexión con el servidor', 'error');
        } finally {
            btnActualizar.disabled = false;
            btnActualizar.innerHTML = textoOriginal;
        }
    }

    mostrarModal() {
        const modal = document.getElementById('modal-sync-resultados');
        if (modal) modal.style.display = 'flex';
    }

    cerrarModal() {
        const modal = document.getElementById('modal-sync-resultados');
        if (modal) modal.style.display = 'none';
    }

    renderizarPagina() {
        const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        const cambiosPagina = this.cambios.slice(inicio, fin);

        // Actualizar resumen
        const actualizados = this.cambios.filter(c => c.tipo === 'actualizado').length;
        const nuevos = this.cambios.filter(c => c.tipo === 'nuevo').length;

        document.getElementById('sync-count-actualizados').textContent = actualizados;
        document.getElementById('sync-count-nuevos').textContent = nuevos;
        document.getElementById('sync-total-cambios').textContent = this.cambios.length;

        // Renderizar cambios
        const listDiv = document.getElementById('sync-cambios-list');
        listDiv.innerHTML = '';

        cambiosPagina.forEach(cambio => {
            const cambioDiv = document.createElement('div');
            cambioDiv.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background: #f9f9f9;';

            let tipoEtiqueta = cambio.tipo === 'nuevo' ? '🆕 Nuevo' : '✏️ Actualizado';
            let tipoColor = cambio.tipo === 'nuevo' ? '#27ae60' : '#f39c12';

            let contenidoDetalles = '';
            if (cambio.cambios && typeof cambio.cambios === 'object') {
                Object.entries(cambio.cambios).forEach(([campo, valores]) => {
                    const anterior = valores.anterior !== undefined ? valores.anterior : '(vacío)';
                    const nuevo = valores.nuevo !== undefined ? valores.nuevo : '(vacío)';
                    contenidoDetalles += `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 6px; font-weight: 600; color: #2c3e50; width: 20%;">${this.normalizarCampo(campo)}</td>
                            <td style="padding: 6px; color: #e74c3c; font-size: 0.85rem; width: 40%;">Anterior: ${this.truncarTexto(anterior, 50)}</td>
                            <td style="padding: 6px; color: #27ae60; font-size: 0.85rem; width: 40%;">Nuevo: ${this.truncarTexto(nuevo, 50)}</td>
                        </tr>
                    `;
                });
            }

            cambioDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <span style="background: ${tipoColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">${tipoEtiqueta}</span>
                        <span style="margin-left: 10px; font-weight: 600; color: #2c3e50;">SKU: ${cambio.sku || 'N/A'}</span>
                    </div>
                </div>
                ${contenidoDetalles ? `
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        ${contenidoDetalles}
                    </table>
                ` : '<p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Sin detalles de cambios</p>'}
            `;

            listDiv.appendChild(cambioDiv);
        });

        // Actualizar paginación
        const totalPaginas = Math.ceil(this.cambios.length / this.itemsPorPagina);
        document.getElementById('sync-page-info').textContent = `Página ${this.paginaActual} de ${totalPaginas}`;
        document.getElementById('btn-sync-prev').disabled = this.paginaActual === 1;
        document.getElementById('btn-sync-next').disabled = this.paginaActual === totalPaginas;
    }

    normalizarCampo(campo) {
        const mapa = {
            'titulo': 'Título',
            'precio_venta': 'Precio',
            'stock': 'Stock',
            'variantes': 'Variantes',
            'descripcion': 'Descripción',
            'categoria': 'Categoría',
            'estado': 'Estado'
        };
        return mapa[campo] || campo.charAt(0).toUpperCase() + campo.slice(1);
    }

    truncarTexto(texto, maxLength) {
        if (typeof texto !== 'string') return String(texto);
        return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
    }

    paginaAnterior() {
        if (this.paginaActual > 1) {
            this.paginaActual--;
            this.renderizarPagina();
        }
    }

    paginaSiguiente() {
        const totalPaginas = Math.ceil(this.cambios.length / this.itemsPorPagina);
        if (this.paginaActual < totalPaginas) {
            this.paginaActual++;
            this.renderizarPagina();
        }
    }
}

// Inicializar sincronización al cargar el dashboard
window.sincronizacionFirebase = new SincronizacionFirebase();
