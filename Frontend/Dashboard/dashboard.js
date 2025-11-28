const API_URL = 'http://localhost:8000';
const usuario = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

// Seguridad
if (!usuario) window.location.href = '../index.html';
if ((usuario.rol||'').toLowerCase() !== 'admin') { alert("Solo admins"); window.location.href='../Ventas/'; }

// Navegación
window.verSeccion = function(id) {
    document.getElementById('sec-prod').style.display = id==='prod'?'block':'none';
    document.getElementById('sec-rep').style.display = id==='rep'?'block':'none';
};

document.getElementById('btn-logout').addEventListener('click', ()=>{
    sessionStorage.removeItem('usuarioLogueado'); window.location.href='../index.html';
});

// LOGICA PRODUCTOS
let skuActual = null;
document.getElementById('btn-buscar').addEventListener('click', async ()=>{
    const sku = document.getElementById('sku-buscar').value;
    try {
        const res = await fetch(`${API_URL}/productos/${sku}`);
        if(!res.ok) throw new Error("No existe");
        const p = await res.json();
        document.getElementById('lbl-titulo').innerText = p.Titulo;
        document.getElementById('in-precio').value = p['Precio Venta']||0;
        document.getElementById('in-stock').value = p.Stock||0;
        document.getElementById('in-var').value = p.Variantes||'';
        document.getElementById('form-edit').style.display = 'block';
        skuActual = sku;
    } catch(e){ alert(e.message); }
});

document.getElementById('btn-guardar').addEventListener('click', async ()=>{
    const data = {
        sku: skuActual, usuario: usuario.email,
        precio: document.getElementById('in-precio').value,
        nuevo_stock: document.getElementById('in-stock').value,
        variantes: document.getElementById('in-var').value
    };
    await fetch(`${API_URL}/productos`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    alert("Guardado");
});

// LOGICA REPORTES
document.getElementById('btn-reporte').addEventListener('click', async ()=>{
    const ini = document.getElementById('f-ini').value;
    const fin = document.getElementById('f-fin').value;
    const res = await fetch(`${API_URL}/reportes/ventas?inicio=${ini}&fin=${fin}`);
    const data = await res.json();
    
    document.getElementById('resumen').style.display = 'block';
    document.getElementById('txt-monto').innerText = "$" + (data.total_monto||0);
    
    const tbody = document.getElementById('tabla-rep');
    tbody.innerHTML = '';
    (data.ventas||[]).forEach(v => {
        tbody.innerHTML += `<tr><td>${v.id_venta}</td><td>${v.fecha.split('T')[0]}</td><td>${v.email_usuario}</td><td>$${v.total}</td></tr>`;
    });
});