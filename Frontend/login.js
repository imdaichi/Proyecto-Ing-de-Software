const API_URL = 'http://localhost:8000'; 

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgError = document.getElementById('error-mensaje'); 
    const btn = document.getElementById('login-boton');

    const textoOriginal = btn.innerText;
    btn.innerText = "Verificando...";
    btn.disabled = true;
    if(msgError) msgError.style.display = 'none';

    try {
        console.log("Enviando credenciales al servidor...");

        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        console.log("Respuesta del servidor:", data);

        if (res.ok) {
            sessionStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));

            const rolCrudo = data.usuario.rol;
            const rol = (rolCrudo || '').trim().toLowerCase();

            console.log(`Rol detectado: "${rol}" (Original: "${rolCrudo}")`);

            if (rol === 'admin') {
                console.log("Redirigiendo a Dashboard...");
                window.location.href = 'Dashboard/'; 
            } else {
                console.log("Redirigiendo a Ventas...");
                window.location.href = 'Ventas/';
            }
        } else {
            if(msgError) {
                msgError.innerText = data.error || "Credenciales incorrectas";
                msgError.style.display = 'block';
            } else {
                alert(data.error || "Error de acceso");
            }
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        if(msgError) {
            msgError.innerText = "Error de conexión con el servidor (Backend)";
            msgError.style.display = 'block';
        }
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
});