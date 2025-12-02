// ==========================================
// DASHBOARD.JS - VERSIÓN MAESTRA COMPLETA
// ==========================================
const API_URL = 'http://localhost:8000';
const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

// --- 1. SEGURIDAD Y NAVEGACIÓN ---
if (!usuarioLogueado) window.location.href = '../index.html';
if ((usuarioLogueado.rol || usuarioLogueado.role || '').toLowerCase() !== 'admin') { 
    alert("Acceso restringido."); window.location.href='../Ventas/'; 
}

// Navegación entre pestañas
window.verSeccion = function(id) {
    const tabs = ['home', 'prod', 'rep', 'users', 'prov'];
    
    tabs.forEach(t => {
        const sec = document.getElementById('sec-' + t);
        const nav = document.getElementById('nav-' + t);
        if(sec) sec.classList.remove('active');
        if(nav) nav.classList.remove('active');
    });

    const secActiva = document.getElementById('sec-' + id);
    const navActivo = document.getElementById('nav-' + id);
    
    if(secActiva) secActiva.classList.add('active');
    if(navActivo) navActivo.classList.add('active');

    // Cargas automáticas al entrar a la sección
    if(id === 'home') cargarResumenDashboard();
    if(id === 'prod') cargarMovimientos();
    if(id === 'users') cargarUsuarios();
    if(id === 'prov') cargarProveedores();
};

document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    sessionStorage.removeItem('usuarioLogueado'); window.location.href='../index.html';
});

window.cerrarModal = function(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none'; 
};


// ==========================================
// 3. LOGICA DASHBOARD INICIO (GRÁFICOS)
// ==========================================
let miGrafico = null; 

async function cargarResumenDashboard() {
    try {
        const res = await fetch(`${API_URL}/reportes?tipo=dashboard`);
        const data = await res.json();

        // Llenar Tarjetas
        document.getElementById('kpi-top-prod').innerText = data.top_producto || 'Sin ventas';
        document.getElementById('kpi-valor-inv').innerText = "$" + (data.valor_inventario || 0).toLocaleString();
        
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('kpi-mes-actual').innerText = meses[new Date().getMonth()];

        // Dibujar Gráfico
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
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Tendencia de Ventas por Mes' }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (e) { console.error("Error dashboard:", e); }
}

// Carga Inicial
cargarResumenDashboard();


// ==========================================
// 4. LOGICA BITÁCORA DE MOVIMIENTOS
// ==========================================
async function cargarMovimientos(skuFiltro = null) {
    const tbody = document.getElementById('tabla-mov-body');
    const infoDiv = document.getElementById('info-producto');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

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

        let url = `${API_URL}/movimientos` + (skuFiltro ? `?sku=${encodeURIComponent(skuFiltro)}` : '');
        const resMov = await fetch(url);
        const movimientos = await resMov.json();

        tbody.innerHTML = '';
        if (movimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay movimientos.</td></tr>';
            return;
        }

        movimientos.forEach(m => {
            let tipoColor = '#95a5a6';
            const tipo = (m.tipo || '').toLowerCase();
            if(tipo.includes('entrada')) tipoColor = '#27ae60';
            if(tipo.includes('salida')) tipoColor = '#c0392b';
            if(tipo.includes('precio')) tipoColor = '#f39c12';
            if(tipo.includes('edicion')) tipoColor = '#3498db';

            const fecha = m.fecha ? new Date(m.fecha).toLocaleString() : '-';
            let detalle = m.detalle || '---';
            if (m.proveedor && tipo.includes('entrada')) {
                detalle += `<br><span style="color:#27ae60; font-size:0.8rem;">🚚 Prov: ${m.proveedor}</span>`;
            }

            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px; font-size:0.85rem;">${fecha}</td>
                    <td><b>${m.sku}</b><br><small>${m.titulo}</small></td>
                    <td><span style="background:${tipoColor}; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${tipo.toUpperCase()}</span></td>
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
            document.getElementById('txt-monto').innerText = "$" + (data.total_monto||0);
            
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
        btnExcel.innerText="⏳..."; btnExcel.disabled=true;
        
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
        finally { btnExcel.innerText="📥 Descargar Excel"; btnExcel.disabled=false; }
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
    const data = {
        id_db: document.getElementById('edit-user-id').value,
        nombre: document.getElementById('edit-user-nombre').value,
        rol: document.getElementById('edit-user-rol').value
    };
    try {
        await fetch(`${API_URL}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        alert("Guardado"); cerrarModal('modal-editar-usuario'); cargarUsuarios();
    } catch(e) { alert("Error"); }
});

window.eliminarUsuario = async function(id, email) {
    if(!confirm(`¿Eliminar a ${email}?`)) return;
    await fetch(`${API_URL}/usuarios?id=${id}`, { method:'DELETE' });
    cargarUsuarios();
};
document.getElementById('nav-users')?.addEventListener('click', cargarUsuarios);
document.getElementById('btn-cargar-usuarios')?.addEventListener('click', cargarUsuarios);


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

            tbody.innerHTML += `
            <tr style="background:white;box-shadow:0 2px 5px rgba(0,0,0,0.05);border-radius:8px">
                <td style="padding:15px"><b>${x.nombre}</b></td>
                <td>${x.contacto||'-'}</td>
                <td>📞 ${x.telefono}<br>✉️ ${x.email}</td>
                <td>${x.categoria}</td>
                <td align="right">${btnEd} ${btnDel}</td>
            </tr>`;
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
    if(!confirm(`¿Eliminar proveedor ${nombre}?`)) return;
    await fetch(`${API_URL}/proveedores?id=${id}`, { method:'DELETE' });
    cargarProveedores();
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
        alert("Guardado"); cerrarModal('modal-editar-prov'); cargarProveedores();
    } catch(e) { alert("Error"); }
});

document.getElementById('btn-nuevo-prov')?.addEventListener('click', () => {
    document.getElementById('new-prov-nombre').value = '';
    document.getElementById('modal-crear-prov').style.display = 'flex';
});

document.getElementById('btn-guardar-nuevo-prov')?.addEventListener('click', async () => {
    const data = {
        nombre: document.getElementById('new-prov-nombre').value,
        contacto: document.getElementById('new-prov-contacto').value,
        telefono: document.getElementById('new-prov-tel').value,
        email: document.getElementById('new-prov-email').value,
        categoria: document.getElementById('new-prov-cat').value
    };
    if(!data.nombre) return alert("Nombre obligatorio");
    try {
        await fetch(`${API_URL}/proveedores`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        alert("Creado"); cerrarModal('modal-crear-prov'); cargarProveedores();
    } catch(e) { alert("Error"); }
});

// ==========================================
// LOGICA IMPORTAR CSV
// ==========================================

// 1. Abrir Modal
document.getElementById('btn-abrir-importar')?.addEventListener('click', () => {
    document.getElementById('modal-importar').style.display = 'flex';
    document.getElementById('input-csv').value = ''; // Limpiar input
    document.getElementById('msg-importar').innerText = '';
});

// 2. Subir Archivo
document.getElementById('btn-subir-csv')?.addEventListener('click', async () => {
    const input = document.getElementById('input-csv');
    const msg = document.getElementById('msg-importar');
    
    if (input.files.length === 0) return alert("Selecciona un archivo primero");
    
    const archivo = input.files[0];
    const formData = new FormData();
    formData.append('archivo_csv', archivo); // El nombre 'archivo_csv' debe coincidir con PHP

    msg.innerText = "⏳ Subiendo y procesando...";
    msg.style.color = "blue";
    
    try {
        const res = await fetch(`${API_URL}/importar`, {
            method: 'POST',
            body: formData // No ponemos Content-Type header, fetch lo pone solo con el boundary
        });

        const data = await res.json();

        if (res.ok) {
            msg.innerText = `✅ Éxito: ${data.procesados} productos procesados. (${data.errores} errores)`;
            msg.style.color = "green";
            // Recargar tabla de movimientos o productos si tienes una
            if(typeof cargarMovimientos === 'function') cargarMovimientos(); 
        } else {
            throw new Error(data.error || "Error desconocido");
        }
    } catch (e) {
        msg.innerText = "❌ Error: " + e.message;
        msg.style.color = "red";
    }
});

document.getElementById('nav-prov')?.addEventListener('click', cargarProveedores);
document.getElementById('btn-cargar-prov')?.addEventListener('click', cargarProveedores);