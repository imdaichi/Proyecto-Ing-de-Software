const LOGIN_API_URL = 'http://localhost:8000/login';

document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const errorMensaje = document.getElementById('error-mensaje');
    const loginBoton = document.getElementById('login-boton');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        loginBoton.disabled = true;
        loginBoton.innerText = "Ingresando...";
        errorMensaje.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(LOGIN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login exitoso:', data);
                sessionStorage.setItem('usuarioLogueado', JSON.stringify(data));
                const rol = (data.rol || data.role || 'vendedor').toLowerCase().trim();
                if (rol === 'admin' || rol === 'administrador') {
                    window.location.href = 'Dashboard/';
                } else {
                    window.location.href = 'Ventas/';
                }
            } else {
                // Mostrar mensaje de error del servidor si existe, sino un mensaje genérico
                const message = data && (data.message || data.error) ? (data.message || data.error) : 'Credenciales inválidas';
                console.warn('Login fallido:', message);
                errorMensaje.innerText = message;
                errorMensaje.style.display = 'block';

                loginBoton.disabled = false;
                loginBoton.innerText = "Ingresar";
            }
        } catch (error) {
            console.error('Error en el login:', error);
            errorMensaje.innerText = error.message || 'Error de red';
            errorMensaje.style.display = 'block';
            
            loginBoton.disabled = false;
            loginBoton.innerText = "Ingresar";
        }
    });
});