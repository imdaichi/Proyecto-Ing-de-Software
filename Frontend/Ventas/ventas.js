const API_URL = 'http://localhost:8000'; 

function formatearPeso(num) {
    return new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(num);
}

window.onload = function() {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioLogueado'));
    if (!usuario) { window.location.href = '../index.html'; return; }

    document.getElementById('bienvenida-usuario').innerText = `Hola, ${usuario.nombre || usuario.email}`;

    // ==========================================
    // LÓGICA PARA EL BOTÓN "VOLVER AL DASHBOARD"
    // ==========================================
    const rol = (usuario.rol || usuario.role || '').toLowerCase();
    
    if (rol === 'admin' || rol === 'administrador') {
        const btnVolver = document.getElementById('btn-volver-dash');
        if (btnVolver) {
            btnVolver.style.display = 'block'; // Lo hacemos visible
            
            btnVolver.addEventListener('click', () => {
                // Sube un nivel (..) y entra a Dashboard
                window.location.href = '../Dashboard/';
            });
        }
    }
    // ==========================================
    
    // Logout
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

    // Escaner
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
            if(!res.ok) throw new Error("No encontrado");
            const prod = await res.json();
            
            const existe = ventaActual.find(i => i.sku === (prod.id_sku_en_db || sku));
            if(existe) existe.cantidad++;
            else ventaActual.push({ sku: prod.id_sku_en_db || sku, producto: prod, cantidad: 1 });
            
            actualizar();
            escaner.value = ''; escaner.focus();
        } catch(e) { alert(e.message); escaner.select(); }
        finally { escaner.disabled = false; escaner.focus(); }
    }

    function actualizar() {
        lista.innerHTML = '';
        let total = 0;
        ventaActual.forEach(item => {
            const p = parseFloat(item.producto['Precio Venta'] || 0);
            total += p * item.cantidad;
            lista.innerHTML += `<div class="item-producto"><strong>${item.producto.Titulo}</strong> x${item.cantidad}<div style="float:right;">${formatearPeso(p*item.cantidad)}</div></div>`;
        });
        totalEl.innerText = formatearPeso(total);
    }

    // Botones
    document.getElementById('btn-buscar').addEventListener('click', () => {
        if(ventaActual.length){ const c=prompt("Cantidad:"); if(c>0){ventaActual[ventaActual.length-1].cantidad=parseInt(c); actualizar();}}
    });
    document.getElementById('btn-producto').addEventListener('click', () => {
        if(ventaActual.length){ ventaActual.pop(); actualizar(); }
    });
    document.getElementById('btn-cancelar').addEventListener('click', () => {
        if(confirm("¿Limpiar?")) { ventaActual=[]; actualizar(); escaner.focus(); }
    });
    document.getElementById('btn-cobrar').addEventListener('click', async () => {
        if(ventaActual.length===0) return;
        if(!confirm("¿Procesar?")) return;
        
        const totalFinal = ventaActual.reduce((acc, i) => acc + (parseFloat(i.producto['Precio Venta']||0)*i.cantidad), 0);
        
        try {
            const res = await fetch(`${API_URL}/ventas`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    email_usuario: usuario.email, items: ventaActual, total: totalFinal, metodo_pago: 'efectivo', estado: 'completada'
                })
            });
            if(res.ok) { alert("Venta OK"); ventaActual=[]; actualizar(); }
        } catch(e) { alert("Error"); }
    });
}