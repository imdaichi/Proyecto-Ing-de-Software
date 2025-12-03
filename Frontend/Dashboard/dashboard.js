// ==========================================================
// DASHBOARD.JS - VERSIÓN MAESTRA FINAL (TODO INCLUIDO)
// ==========================================================
const API_URL = 'http://localhost:8000';
const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

// --- 1. SEGURIDAD ---
if (!usuarioLogueado) window.location.href = '../index.html';
if ((usuarioLogueado.rol || usuarioLogueado.role || '').toLowerCase() !== 'admin') { 
    alert("Acceso restringido."); window.location.href='../Ventas/'; 
}

document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    sessionStorage.removeItem('usuarioLogueado'); window.location.href='../index.html';
});

window.cerrarModal = function(id) { document.getElementById(id).style.display = 'none'; };

// --- 2. NAVEGACIÓN ---
window.verSeccion = function(id) {
    const tabs = ['home', 'prod', 'rep', 'users', 'prov'];
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

    // Control del botón flotante - solo visible en Bitácora
    const btnFlotante = document.querySelector('.btn-flotante');
    if(btnFlotante) {
        btnFlotante.style.display = (id === 'prod') ? 'flex' : 'none';
    }

    // Cargas automáticas
    if(id === 'home') cargarResumenDashboard();
    if(id === 'prod') cargarMovimientos();
    if(id === 'users') cargarUsuarios();
    if(id === 'prov') cargarProveedores();
};


// ==========================================
// 3. DASHBOARD INICIO (GRÁFICOS)
// ==========================================
let miGrafico = null; 
async function cargarResumenDashboard() {
    try {
        const res = await fetch(`${API_URL}/reportes?tipo=dashboard`);
        const data = await res.json();

        document.getElementById('kpi-top-prod').innerText = data.top_producto || 'Sin ventas';
        document.getElementById('kpi-valor-inv').innerText = "$" + (data.valor_inventario || 0).toLocaleString();
        
        // Eliminado KPI de Mes Actual

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
                    backgroundColor: 'rgba(41, 84, 46, 0.6)', // Verde #29542e con transparencia
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
    } catch (e) { console.error("Error dashboard:", e); }
}
// Carga inicial
cargarResumenDashboard();


// ==========================================
// 4. BITÁCORA DE MOVIMIENTOS
// ==========================================
async function cargarMovimientos(skuFiltro = null) {
    const tbody = document.getElementById('tabla-mov-body');
    const infoDiv = document.getElementById('info-producto');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" align="center">Cargando...</td></tr>';

    try {
        if (skuFiltro) {
            const resProd = await fetch(`${API_URL}/productos/${encodeURIComponent(skuFiltro)}`);
            if (resProd.ok) {
                const prod = await resProd.json();
                infoDiv.style.display = 'block';
                document.getElementById('lbl-titulo').innerText = `${prod.Titulo} (${prod.id_sku_en_db})`;
                document.getElementById('lbl-stock').innerText = prod.Stock || 0;
                document.getElementById('lbl-precio').innerText = "$" + (prod['Precio Venta'] || 0);
            }
        } else {
            if(infoDiv) infoDiv.style.display = 'none';
        }

        let url = `${API_URL}/movimientos` + (skuFiltro ? `?sku=${encodeURIComponent(skuFiltro)}` : '');
        const resMov = await fetch(url);
        const movimientos = await resMov.json();

        tbody.innerHTML = '';
        if (movimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" align="center">No hay movimientos.</td></tr>';
            return;
        }

        movimientos.forEach(m => {
            let color = '#95a5a6'; // Gris
            let tipo = (m.tipo || '').toLowerCase();
            if(tipo.includes('entrada')) color = '#27ae60'; // Verde
            if(tipo.includes('salida')) color = '#c0392b'; // Rojo
            if(tipo.includes('precio')) color = '#f39c12'; // Naranja
            if(tipo.includes('edicion')) color = '#3498db'; // Azul

            let detalle = m.detalle || '-';
            if (m.proveedor && tipo.includes('entrada')) {
                detalle += `<br><span style="color:#27ae60; font-size:0.8rem;">🚚 ${m.proveedor}</span>`;
            }

            // BOTÓN DE EDICIÓN RÁPIDA EN LA TABLA
            let btnEditRow = `<button onclick="abrirModalEditarProducto('${m.sku}')" style="border:none; bg:none; cursor:pointer;" title="Editar">✏️</button>`;

            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px; font-size:0.85rem;">${new Date(m.fecha).toLocaleString()}</td>
                    <td><b>${m.sku}</b> ${btnEditRow}<br><small>${m.titulo}</small></td>
                    <td><span style="background:${color}; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${tipo.toUpperCase()}</span></td>
                    <td style="font-size:0.9rem;">${detalle}</td>
                    <td style="font-size:0.85rem;">${m.usuario || 'Sistema'}</td>
                </tr>`;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="color:red">${e.message}</td></tr>`; }
}

document.getElementById('btn-buscar')?.addEventListener('click', () => {
    const sku = document.getElementById('sku-buscar').value.trim();
    if(sku) cargarMovimientos(sku); else alert("Ingresa SKU");
});
document.getElementById('btn-ver-todos')?.addEventListener('click', () => {
    document.getElementById('sku-buscar').value = ''; cargarMovimientos(null);
});


// ==========================================
// 5. REPORTES VENTAS
// ==========================================
const btnReporte = document.getElementById('btn-reporte');
if (btnReporte) {
    btnReporte.addEventListener('click', async ()=>{
        const ini = document.getElementById('f-ini')?.value;
        const fin = document.getElementById('f-fin')?.value;
        if(!ini || !fin) return alert("Faltan fechas");
        document.getElementById('container-excel').style.display='none';

        try {
            const res = await fetch(`${API_URL}/reportes?inicio=${ini}&fin=${fin}`);
            const data = await res.json();
            
            document.getElementById('resumen').style.display='block';
            const totalCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(parseInt(data.total_monto || 0));
            document.getElementById('txt-monto').innerText = totalCLP;
            
            const tbody = document.getElementById('tabla-rep');
            tbody.innerHTML='';
            
            if (data.ventas && data.ventas.length > 0) {
                data.ventas.forEach(v => {
                    const items = Array.isArray(v.items) ? v.items : [];
                    let lista = items.map(i=>{
                        let n = i.titulo||i.Titulo||(i.producto?i.producto.Titulo:null)||'Prod';
                        return `• ${n} (x${i.cantidad})`;
                    }).join('<br>');

                    let pago = v.metodo_pago || '-';
                    
                    tbody.innerHTML += `
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:10px">${new Date(v.fecha).toLocaleString()}</td>
                        <td><small>${v.id_venta.substr(0,8)}</small></td>
                        <td>${v.email_usuario}</td>
                        <td>${pago}</td>
                        <td>${lista}</td>
                        <td style="text-align:right"><b>$${v.total}</b></td>
                    </tr>`;
                });
                document.getElementById('container-excel').style.display='block';
            } else { tbody.innerHTML='<tr><td colspan="6" align="center">Sin ventas</td></tr>'; }
        } catch(e) { console.error(e); }
    });
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
    alert("Guardado"); cerrarModal('modal-editar-usuario'); cargarUsuarios();
});
window.eliminarUsuario = async function(id, email) {
    if(!confirm(`¿Eliminar a ${email}?`)) return;
    await fetch(`${API_URL}/usuarios?id=${id}`, { method:'DELETE' });
    cargarUsuarios();
};

// Crear usuario (similar a Proveedores)
document.getElementById('btn-nuevo-user')?.addEventListener('click', () => {
    document.getElementById('modal-crear-usuario').style.display = 'flex';
});
document.getElementById('btn-guardar-nuevo-user')?.addEventListener('click', async () => {
    const nombre = document.getElementById('new-user-nombre').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const rol = document.getElementById('new-user-rol').value;
    const contrasena = document.getElementById('new-user-pass')?.value || null;
    if (!nombre || !email) return alert('Nombre y Email son obligatorios');
    if (!contrasena || contrasena.length < 6) return alert('La contraseña es obligatoria y debe tener al menos 6 caracteres');
    try {
        const payload = { nombre, email, rol, contrasena };
        const res = await fetch(`${API_URL}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if (!res.ok) {
            const e = await res.json();
            return alert('Error: ' + (e.error || 'No se pudo crear'));
        }
        alert('Usuario creado');
        cerrarModal('modal-crear-usuario');
        cargarUsuarios();
    } catch (e) { alert('Error de conexión'); }
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
    if(!confirm(`¿Eliminar ${nombre}?`)) return;
    await fetch(`${API_URL}/proveedores?id=${id}`, { method:'DELETE' });
    cargarProveedores();
};
document.getElementById('btn-guardar-prov')?.addEventListener('click', async () => {
    const data = { id_prov: document.getElementById('edit-prov-id').value, nombre: document.getElementById('edit-prov-nombre').value, contacto: document.getElementById('edit-prov-contacto').value, telefono: document.getElementById('edit-prov-tel').value, email: document.getElementById('edit-prov-email').value, categoria: document.getElementById('edit-prov-cat').value };
    await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    alert("Guardado"); cerrarModal('modal-editar-prov'); cargarProveedores();
});
document.getElementById('btn-nuevo-prov')?.addEventListener('click', () => { document.getElementById('modal-crear-prov').style.display = 'flex'; });
document.getElementById('btn-guardar-nuevo-prov')?.addEventListener('click', async () => {
    const data = { nombre: document.getElementById('new-prov-nombre').value, contacto: document.getElementById('new-prov-contacto').value, telefono: document.getElementById('new-prov-tel').value, email: document.getElementById('new-prov-email').value, categoria: document.getElementById('new-prov-cat').value };
    if(!data.nombre) return alert("Nombre obligatorio");
    await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    alert("Creado"); cerrarModal('modal-crear-prov'); cargarProveedores();
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
        if(!res.ok) throw new Error("Error al cargar producto");
        const p = await res.json();
        
        document.getElementById('edit-prod-sku').value = p.id_sku_en_db; 
        document.getElementById('edit-prod-titulo').value = p.Titulo;
        document.getElementById('edit-prod-precio').value = p['Precio Venta'];
        document.getElementById('edit-prod-stock').value = p.Stock;
        document.getElementById('edit-prod-variante').value = p.variantes || '';
        document.getElementById('edit-prod-cat').value = p.categoria || '';
        document.getElementById('edit-prod-desc').value = p.descripcion || '';

        document.getElementById('modal-editar-prod').style.display = 'flex';
    } catch(e) { alert("Error: " + e.message); }
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
        usuario: usuarioLogueado.nombre || 'Admin Web'
    };
    try {
        const res = await fetch(`${API_URL}/productos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        const result = await res.json();
        if(res.ok) { alert("✅ " + result.mensaje); cerrarModal('modal-editar-prod'); cargarMovimientos(); }
        else { alert("❌ " + result.error); }
    } catch(e) { alert("Error conexión"); }
});


// ==========================================
// 10. ACCIÓN BOTÓN FLOTANTE (+)
// ==========================================
window.accionBotonFlotante = function() {
    document.getElementById('modal-buscar-prod').style.display = 'flex';
    document.getElementById('buscar-prod-sku').value = '';
    document.getElementById('buscar-prod-sku').focus();
};

document.getElementById('btn-buscar-prod-modal')?.addEventListener('click', () => {
    const sku = document.getElementById('buscar-prod-sku').value.trim();
    if (sku) {
        cerrarModal('modal-buscar-prod');
        abrirModalEditarProducto(sku);
    } else {
        alert("Ingresa un SKU válido");
    }
});