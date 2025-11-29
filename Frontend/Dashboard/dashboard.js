// ==========================================
// DASHBOARD.JS - CORRECCIÓN NOMBRES PRODUCTOS
// ==========================================
const API_URL = 'http://localhost:8000';
const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

// --- 1. SEGURIDAD Y NAVEGACIÓN ---
if (!usuarioLogueado) window.location.href = '../index.html';
if ((usuarioLogueado.rol || usuarioLogueado.role || '').toLowerCase() !== 'admin') { 
    alert("Acceso restringido a administradores."); window.location.href='../Ventas/'; 
}

window.verSeccion = function(id) {
    ['sec-prod','sec-rep','sec-users','sec-prov'].forEach(s => document.getElementById(s).classList.remove('active'));
    ['nav-prod','nav-rep','nav-users','nav-prov'].forEach(n => document.getElementById(n).classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
};

document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    sessionStorage.removeItem('usuarioLogueado'); window.location.href='../index.html';
});

window.cerrarModal = function(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none'; 
};


// ==========================================
// 2. LOGICA BITÁCORA DE MOVIMIENTOS
// ==========================================
async function cargarMovimientos(skuFiltro = null) {
    const tbody = document.getElementById('tabla-mov-body');
    const infoDiv = document.getElementById('info-producto');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando bitácora...</td></tr>';

    try {
        if (skuFiltro) {
            const resProd = await fetch(`${API_URL}/productos/${encodeURIComponent(skuFiltro)}`);
            if (!resProd.ok) throw new Error("Producto no encontrado");
            const prod = await resProd.json();
            
            if(infoDiv) {
                infoDiv.style.display = 'block';
                document.getElementById('lbl-titulo').innerText = `${prod.Titulo} (${prod.id_sku_en_db})`;
                document.getElementById('lbl-stock').innerText = prod.Stock || 0;
                document.getElementById('lbl-precio').innerText = "$" + (prod['Precio Venta'] || 0);
            }
        } else {
            if(infoDiv) infoDiv.style.display = 'none';
        }

        let url = `${API_URL}/movimientos`;
        if (skuFiltro) url += `?sku=${encodeURIComponent(skuFiltro)}`;

        const resMov = await fetch(url);
        const movimientos = await resMov.json();

        tbody.innerHTML = '';

        if (movimientos.length > 0) {
            movimientos.forEach(m => {
                let tipoColor = '#95a5a6';
                const tipo = (m.tipo || '').toLowerCase();
                if(tipo.includes('entrada')) tipoColor = '#27ae60';
                if(tipo.includes('salida')) tipoColor = '#c0392b';
                if(tipo.includes('precio')) tipoColor = '#f39c12';

                const fecha = m.fecha ? new Date(m.fecha).toLocaleString() : '-';
                
                let detalle = m.detalle || '---';
                if (m.stock_anterior !== undefined && m.stock_nuevo !== undefined) {
                    detalle = `Stock: <b>${m.stock_anterior}</b> ➝ <b>${m.stock_nuevo}</b>`;
                    if (m.proveedor && tipo.includes('entrada')) {
                        detalle += `<br><span style="color:#27ae60; font-size:0.8rem;">🚚 Prov: ${m.proveedor}</span>`;
                    }
                }

                tbody.innerHTML += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; font-size:0.85rem;">${fecha}</td>
                        <td style="font-weight:bold; color:#2c3e50;">
                            ${m.sku}<br>
                            <span style="font-size:0.75rem; color:#7f8c8d; font-weight:normal;">${m.titulo || ''}</span>
                        </td>
                        <td><span style="background:${tipoColor}; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem; text-transform:uppercase;">${tipo}</span></td>
                        <td style="font-size:0.9rem;">${detalle}</td>
                        <td style="font-size:0.85rem; color:#34495e;">👤 ${m.usuario || 'Sistema'}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay movimientos registrados.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
    }
}

document.getElementById('btn-buscar')?.addEventListener('click', () => {
    const sku = document.getElementById('sku-buscar').value.trim();
    if(sku) cargarMovimientos(sku);
    else alert("Ingresa un SKU para filtrar");
});

document.getElementById('btn-ver-todos')?.addEventListener('click', () => {
    document.getElementById('sku-buscar').value = '';
    cargarMovimientos(null);
});

// Carga inicial
cargarMovimientos(null);


// ==========================================
// 3. LOGICA REPORTES VENTAS (TABLA DETALLADA)
// ==========================================
const btnReporte = document.getElementById('btn-reporte');
const containerExcel = document.getElementById('container-excel');

if (btnReporte) {
    btnReporte.addEventListener('click', async ()=>{
        const ini = document.getElementById('f-ini')?.value;
        const fin = document.getElementById('f-fin')?.value;
        if(!ini || !fin) return alert("Faltan fechas");

        if(containerExcel) containerExcel.style.display = 'none';

        try {
            const res = await fetch(`${API_URL}/reportes/ventas?inicio=${ini}&fin=${fin}`);
            const data = await res.json();
            
            const resumen = document.getElementById('resumen');
            if(resumen) {
                resumen.style.display = 'block';
                document.getElementById('txt-monto').innerText = "$" + (data.total_monto||0);
            }
            
            const tbody = document.getElementById('tabla-rep');
            if(tbody) {
                tbody.innerHTML = '';
                if (data.ventas && data.ventas.length > 0) {
                    
                    data.ventas.forEach(v => {
                        const fechaObj = new Date(v.fecha);
                        const fechaStr = fechaObj.toLocaleDateString() + ' ' + fechaObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        
                        let pago = v.metodo_pago || 'Desconocido';
                        pago = pago.charAt(0).toUpperCase() + pago.slice(1);

                        // --- CORRECCIÓN AQUÍ: Buscamos i.titulo directamente ---
                        const items = Array.isArray(v.items) ? v.items : [];
                        let listaHTML = '';
                        items.forEach(i => {
                             // Intentamos obtener el título de varias formas posibles
                             const nombre = i.titulo || i.Titulo || (i.producto ? i.producto.Titulo : null) || 'Prod. Sin Nombre';
                             listaHTML += `<div style="font-size:0.85rem;">• ${nombre} (x${i.cantidad})</div>`;
                        });

                        tbody.innerHTML += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px; font-size:0.9rem;">${fechaStr}</td>
                                <td style="font-size:0.8rem; color:#777;">${v.id_venta.substr(0,8)}...</td>
                                <td>${v.email_usuario}</td>
                                <td><span style="background:#eaf2f8; color:#2980b9; padding:2px 6px; border-radius:4px; font-size:0.85rem;">${pago}</span></td>
                                <td style="color:#444;">${listaHTML}</td>
                                <td style="text-align:right; font-weight:bold;">$${v.total}</td>
                            </tr>`;
                    });

                    if(containerExcel) containerExcel.style.display = 'block';
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay ventas en este rango.</td></tr>';
                }
            }
        } catch(e) { console.error(e); }
    });
}


// ==========================================
// LOGICA EXPORTAR A EXCEL (CORREGIDA)
// ==========================================
const btnExcel = document.getElementById('btn-exportar-excel');
if (btnExcel) {
    btnExcel.onclick = async function(e) {
        e.preventDefault();
        
        const ini = document.getElementById('f-ini')?.value;
        const fin = document.getElementById('f-fin')?.value;
        if (!ini || !fin) return;

        const textoOriginal = "📥 Descargar Reporte en Excel";
        btnExcel.innerText = "⏳ Procesando...";
        btnExcel.disabled = true;

        try {
            const res = await fetch(`${API_URL}/reportes/ventas?inicio=${ini}&fin=${fin}`);
            const data = await res.json();
            
            if (!data.ventas || data.ventas.length === 0) {
                alert("No hay ventas para exportar.");
                return;
            }

            // 1. Formatear datos
            const filasExcel = data.ventas.map(venta => {
                const items = Array.isArray(venta.items) ? venta.items : [];
                
                // --- CORRECCIÓN AQUÍ TAMBIÉN ---
                const detalle = items.map(i => {
                    // Priorizamos 'i.titulo' que es lo que tienes en tu BD
                    const titulo = i.titulo || i.Titulo || (i.producto ? i.producto.Titulo : null) || 'Prod. Sin Nombre';
                    const cant = i.cantidad || 0;
                    return `${titulo} (x${cant})`;
                }).join(', ');

                return {
                    "ID Venta": venta.id_venta || '-',
                    "Fecha Completa": venta.fecha ? new Date(venta.fecha).toLocaleString() : '-',
                    "Vendedor": venta.email_usuario || 'Desconocido',
                    "Método Pago": venta.metodo_pago || 'No especificado',
                    "Descuento Aplicado": venta.descuento_aplicado ? 'SÍ' : 'NO',
                    "Productos": detalle,
                    "Total ($)": parseInt(venta.total) || 0
                };
            });

            // 2. Crear Excel
            const libro = XLSX.utils.book_new();
            const hoja = XLSX.utils.json_to_sheet(filasExcel);
            hoja['!cols'] = [
                {wch: 25}, {wch: 22}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 50}, {wch: 12}
            ];

            XLSX.utils.book_append_sheet(libro, hoja, "Ventas_Detalladas");

            // 3. Generar Blob
            const wbout = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            
            // 4. Descarga Manual
            const a = document.createElement("a");
            document.body.appendChild(a);
            a.href = url;
            const hoy = new Date().toISOString().split('T')[0];
            a.download = `Reporte_Completo_${hoy}.xlsx`;
            
            a.click();

            setTimeout(() => {
                try {
                    if (document.body.contains(a)) document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } catch (err) {}
            }, 1000);

        } catch(e) { 
            console.error("Error descarga:", e);
            alert("Error al descargar");
        }
        finally { 
            btnExcel.innerText = textoOriginal;
            btnExcel.disabled = false;
        }
    };
}


// ==========================================
// 4. LOGICA USUARIOS
// ==========================================
async function cargarUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        if (!res.ok) throw new Error("Error al cargar");
        const usuarios = await res.json();
        
        tbody.innerHTML = ''; 

        usuarios.forEach(u => {
            const rol = (u.rol||'vendedor').toLowerCase();
            const colorRol = rol === 'admin' ? 'red' : 'green';
            
            const btnEdit = `<button class="btn-editar-tabla" onclick="abrirModalUsuario('${u.id_db}', '${u.email}', '${u.nombre||''}', '${rol}')" title="Editar">✏️</button>`;
            const btnDel = `<button class="btn-editar-tabla" style="background:#c0392b; margin-left:5px;" onclick="eliminarUsuario('${u.id_db}', '${u.email}')" title="Eliminar">🗑️</button>`;
            
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><strong>${u.nombre||'Sin Nombre'}</strong></td>
                    <td>${u.email}</td>
                    <td><span style="background:${colorRol}; color:white; padding:3px 8px; border-radius:4px; font-size:0.8rem;">${rol.toUpperCase()}</span></td>
                    <td style="text-align:right;">${btnEdit} ${rol === 'admin' ? '' : btnDel}</td>
                </tr>`;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4" style="color:red">Error: ${e.message}</td></tr>`; }
}

window.abrirModalUsuario = function(id, email, nombre, rol) {
    const modal = document.getElementById('modal-editar-usuario');
    if(modal) {
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-user-email').value = email;
        document.getElementById('edit-user-nombre').value = nombre;
        document.getElementById('edit-user-rol').value = rol;
        modal.style.display = 'flex';
    }
};

document.getElementById('btn-guardar-user')?.addEventListener('click', async () => {
    const data = {
        id_db: document.getElementById('edit-user-id').value,
        nombre: document.getElementById('edit-user-nombre').value,
        rol: document.getElementById('edit-user-rol').value
    };
    try {
        await fetch(`${API_URL}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        alert("Usuario actualizado");
        cerrarModal('modal-editar-usuario');
        cargarUsuarios();
    } catch(e) { alert("Error al guardar"); }
});

document.getElementById('nav-users')?.addEventListener('click', cargarUsuarios);
document.getElementById('btn-cargar-usuarios')?.addEventListener('click', cargarUsuarios);

window.eliminarUsuario = async function(id, email) {
    if(!confirm(`¿Estás seguro de ELIMINAR al usuario ${email}?\nEsta acción no se puede deshacer.`)) return;
    try {
        const res = await fetch(`${API_URL}/usuarios?id=${id}`, { method: 'DELETE' });
        if(res.ok) { alert("✅ Usuario eliminado."); cargarUsuarios(); } 
        else { alert("Error al eliminar"); }
    } catch(e) { alert("Error de conexión"); }
};


// ==========================================
// 5. LOGICA PROVEEDORES
// ==========================================
async function cargarProveedores() {
    const tbody = document.getElementById('tabla-prov-body');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/proveedores`);
        if (!res.ok) throw new Error("Error");
        const provs = await res.json();
        tbody.innerHTML = '';
        
        if(provs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay proveedores registrados.</td></tr>';
            return;
        }

        provs.forEach(p => {
            const btnEdit = `<button class="btn-editar-tabla" onclick="abrirModalProv('${p.id}', '${p.nombre||''}', '${p.contacto||''}', '${p.telefono||''}', '${p.email||''}', '${p.categoria||''}')" title="Editar">✏️</button>`;
            const btnDel = `<button class="btn-editar-tabla" style="background:#c0392b; margin-left:5px;" onclick="eliminarProveedor('${p.id}', '${p.nombre||''}')" title="Eliminar">🗑️</button>`;

            tbody.innerHTML += `
                <tr style="background:white; box-shadow:0 2px 5px rgba(0,0,0,0.05); border-radius:8px;">
                    <td style="padding:15px;"><strong>${p.nombre||'Sin Nombre'}</strong></td>
                    <td style="padding:15px;">${p.contacto||'-'}</td>
                    <td style="padding:15px;"><div>📞 ${p.telefono}</div><div style="color:blue;font-size:0.8rem;">✉️ ${p.email}</div></td>
                    <td style="padding:15px;"><span style="background:#ecf0f1; padding:5px; border-radius:10px; font-size:0.8rem;">${p.categoria||'Gral'}</span></td>
                    <td style="padding:15px; text-align:right;">${btnEdit} ${btnDel}</td>
                </tr>`;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`; }
}

window.abrirModalProv = function(id, nombre, contacto, tel, email, cat) {
    const modal = document.getElementById('modal-editar-prov');
    if(modal) {
        document.getElementById('edit-prov-id').value = id;
        document.getElementById('edit-prov-nombre').value = nombre;
        document.getElementById('edit-prov-contacto').value = contacto;
        document.getElementById('edit-prov-tel').value = tel;
        document.getElementById('edit-prov-email').value = email;
        document.getElementById('edit-prov-cat').value = cat;
        modal.style.display = 'flex';
    }
};

window.eliminarProveedor = async function(id, nombre) {
    if(!confirm(`⚠️ ¿Eliminar al proveedor "${nombre}"?\nEsta acción es permanente.`)) return;
    try {
        const res = await fetch(`${API_URL}/proveedores?id=${id}`, { method: 'DELETE' });
        if(res.ok) { alert("✅ Eliminado correctamente."); cargarProveedores(); }
        else { alert("Error al eliminar."); }
    } catch(e) { alert("Error de conexión"); }
};

document.getElementById('btn-guardar-prov')?.addEventListener('click', async () => {
    const data = {
        id_prov: document.getElementById('edit-prov-id').value,
        nombre: document.getElementById('edit-prov-nombre').value,
        contacto: document.getElementById('edit-prov-contacto').value,
        telefono: document.getElementById('edit-prov-tel').value,
        email: document.getElementById('edit-prov-email').value,
        categoria: document.getElementById('edit-prov-cat').value
    };
    try {
        await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        alert("Proveedor actualizado");
        cerrarModal('modal-editar-prov');
        cargarProveedores();
    } catch(e) { alert("Error al guardar"); }
});

document.getElementById('btn-nuevo-prov')?.addEventListener('click', () => {
    document.getElementById('new-prov-nombre').value = '';
    document.getElementById('new-prov-contacto').value = '';
    document.getElementById('new-prov-tel').value = '';
    document.getElementById('new-prov-email').value = '';
    document.getElementById('new-prov-cat').value = '';
    document.getElementById('modal-crear-prov').style.display = 'flex';
});

document.getElementById('btn-guardar-nuevo-prov')?.addEventListener('click', async () => {
    const nombre = document.getElementById('new-prov-nombre').value.trim();
    if(!nombre) return alert("El nombre es obligatorio");

    const data = {
        nombre: nombre,
        contacto: document.getElementById('new-prov-contacto').value,
        telefono: document.getElementById('new-prov-tel').value,
        email: document.getElementById('new-prov-email').value,
        categoria: document.getElementById('new-prov-cat').value
    };

    try {
        const res = await fetch(`${API_URL}/proveedores`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        });
        if(res.ok) { alert("✅ Proveedor creado"); cerrarModal('modal-crear-prov'); cargarProveedores(); }
        else { alert("Error al crear"); }
    } catch(e) { alert("Error de conexión"); }
});

document.getElementById('nav-prov')?.addEventListener('click', cargarProveedores);
document.getElementById('btn-cargar-prov')?.addEventListener('click', cargarProveedores);