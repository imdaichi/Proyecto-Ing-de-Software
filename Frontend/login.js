const LOGIN_API_URL = 'http://localhost:8000/api/login';

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
                
                window.location.href = 'tpv.html';
                
            } else {
                throw new Error(data.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error en el login:', error);
            errorMensaje.innerText = error.message;
            errorMensaje.style.display = 'block';
            
            loginBoton.disabled = false;
            loginBoton.innerText = "Ingresar";
        }
    });
});