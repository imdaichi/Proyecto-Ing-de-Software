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

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA
// ==========================================

// Abrir modal
document.getElementById('link-recuperar')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('modal-recuperar').style.display = 'flex';
    document.getElementById('mensaje-modal').style.display = 'none';
    document.getElementById('email-usuario').value = '';
    document.getElementById('password-admin').value = '';
    document.getElementById('nueva-password').value = '';
    document.getElementById('confirmar-password').value = '';
});

// Cerrar modal
document.getElementById('btn-cerrar-modal')?.addEventListener('click', () => {
    document.getElementById('modal-recuperar').style.display = 'none';
});

// Cerrar modal al hacer click fuera
document.getElementById('modal-recuperar')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-recuperar') {
        document.getElementById('modal-recuperar').style.display = 'none';
    }
});

// Cambiar contraseña con verificación de admin
document.getElementById('btn-cambiar-password')?.addEventListener('click', async () => {
    const emailUsuario = document.getElementById('email-usuario').value.trim();
    const passwordAdmin = document.getElementById('password-admin').value;
    const nuevaPass = document.getElementById('nueva-password').value;
    const confirmarPass = document.getElementById('confirmar-password').value;
    const btn = document.getElementById('btn-cambiar-password');
    const mensajeModal = document.getElementById('mensaje-modal');
    
    if (!emailUsuario) {
        mostrarMensaje('Ingresa el email del usuario', 'error');
        return;
    }
    
    if (!passwordAdmin) {
        mostrarMensaje('Ingresa la contraseña del administrador', 'error');
        return;
    }
    
    if (!nuevaPass || nuevaPass.length < 6) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (nuevaPass !== confirmarPass) {
        mostrarMensaje('Las contraseñas no coinciden', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Cambiando...';
    mensajeModal.style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/recuperar-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_usuario: emailUsuario,
                password_admin: passwordAdmin,
                nueva_password: nuevaPass
            })
        });
        
        const data = await res.json();
        
        if (res.ok && data.exito) {
            mostrarMensaje('¡Contraseña actualizada correctamente!', 'success');
            
            setTimeout(() => {
                document.getElementById('modal-recuperar').style.display = 'none';
                document.getElementById('email').value = emailUsuario;
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }, 2000);
        } else {
            mostrarMensaje(data.error || 'Error al cambiar contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error de conexión', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cambiar Contraseña';
    }
});

// Función auxiliar para mostrar mensajes
function mostrarMensaje(texto, tipo) {
    const mensajeModal = document.getElementById('mensaje-modal');
    mensajeModal.textContent = texto;
    mensajeModal.style.display = 'block';
    mensajeModal.style.background = tipo === 'success' ? '#d4edda' : '#f8d7da';
    mensajeModal.style.color = tipo === 'success' ? '#155724' : '#721c24';
    mensajeModal.style.border = `1px solid ${tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
}