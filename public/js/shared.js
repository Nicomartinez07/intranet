// --- public/js/shared.js (Versión 100% Completa y Final) ---

// === FUNCIONES AUXILIARES GLOBALES (definidas fuera para ser accesibles) ===
const openModal = (modal) => { if (modal) modal.style.display = 'flex'; };
const closeModal = (modal) => { if (modal) modal.style.display = 'none'; };

async function handleLogout(e) {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    alert('Has cerrado la sesión.');
    window.location.href = '/';
}

function buildHeaderControls(data, currentPage = 'index') {
    const headerSessionControls = document.getElementById('header-session-controls');
    if (!headerSessionControls) return;
    headerSessionControls.innerHTML = '';
    
    if (data.loggedIn) {
        const user = data.user;
        const userName = user.nombre || user.username;
        
        headerSessionControls.innerHTML = `
            <div class="user-menu-container">
                <button class="user-menu-button">
                    <span>Hola, ${userName}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="white"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
                </button>
                <div class="user-menu-dropdown" id="user-menu"></div>
            </div>
        `;

        const userMenu = headerSessionControls.querySelector('#user-menu');
        
        if (currentPage === 'dashboard') {
            const homeLink = document.createElement('a');
            homeLink.href = '/';
            homeLink.className = 'menu-button';
            homeLink.innerHTML = '🏠 Home';
            userMenu.appendChild(homeLink);
        } else {
            const dashboardLink = document.createElement('a');
            dashboardLink.href = '/dashboard';
            dashboardLink.className = 'menu-button';
            dashboardLink.innerHTML = '📊 Dashboard';
            userMenu.appendChild(dashboardLink);
        }
        
        const changePassBtn = document.createElement('button');
        changePassBtn.innerHTML = '🔑 Cambiar Contraseña';
        changePassBtn.addEventListener('click', () => openModal(document.getElementById('change-password-modal')));
        userMenu.appendChild(changePassBtn);
        
        if (user.role === 'admin') {
            const usersBtn = document.createElement('button');
            usersBtn.innerHTML = '👥 Usuarios';
            usersBtn.addEventListener('click', openManageUsersModal);
            userMenu.appendChild(usersBtn);
        }

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.innerHTML = '🚪 Cerrar Sesión';
        logoutLink.addEventListener('click', handleLogout);
        userMenu.appendChild(logoutLink);

        headerSessionControls.querySelector('.user-menu-button').addEventListener('click', (e) => {
            e.stopPropagation();
            e.currentTarget.parentElement.classList.toggle('active');
        });
    } else { 
        const loginBtn = document.createElement('button');
        loginBtn.className = 'menu-button-sesion';
        loginBtn.innerHTML = '👤 Iniciar Sesión';
        loginBtn.addEventListener('click', () => openModal(document.getElementById('login-modal')));
        headerSessionControls.appendChild(loginBtn);
    }
}

async function openManageUsersModal() {
    const manageUsersModal = document.getElementById('manage-users-modal');
    if (manageUsersModal){
        openModal(manageUsersModal);
        fetchUsers();
    }
}

async function fetchUsers() {
    const usersListContainer = document.getElementById('users-list-container');
    if (!usersListContainer) return;
    usersListContainer.innerHTML = '<p>Cargando usuarios...</p>';
    try {
        const response = await fetch('/api/users', { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudo cargar la lista de usuarios.');
        const users = await response.json();
        
        usersListContainer.innerHTML = `
            <table class="finanzas-table">
                <thead><tr><th>Apellido</th><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${users.map(user => `<tr data-user-id="${user.id}"><td>${user.apellido || ''}</td><td>${user.nombre || ''}</td><td>${user.username}</td><td>${user.role}</td><td><button class="edit-problem-btn edit-user-btn">Editar</button><button class="delete-problem-btn delete-user-btn">Borrar</button></td></tr>`).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        usersListContainer.innerHTML = `<p style="color:red">${error.message}</p>`;
    }
}
    
function openUserFormModal(user = null) {
    const userFormModal = document.getElementById('user-form-modal');
    const userForm = document.getElementById('user-form');
    if (!userForm || !userFormModal) return;
    userForm.reset();
    const title = document.getElementById('user-modal-title');
    document.getElementById('user-id').value = user ? user.id : '';
    document.getElementById('user-nombre').value = user ? user.nombre : '';
    document.getElementById('user-apellido').value = user ? user.apellido : '';
    document.getElementById('user-username').value = user ? user.username : '';
    document.getElementById('user-role').value = user ? user.role : '';
    document.getElementById('user-password').placeholder = user ? '(Dejar en blanco para no cambiar)' : 'Contraseña*';
    title.textContent = user ? `Editando a ${user.nombre || ''} ${user.apellido || ''}` : 'Crear Nuevo Usuario';
    openModal(userFormModal);
}

// === CÓDIGO DE INICIALIZACIÓN Y EVENTOS ===
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA CORREGIDA DEL MENÚ LATERAL COLAPSABLE ---
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sideMenu = document.getElementById('side-menu');
    const mainContent = document.getElementById('main-content');
    const menuCloseBtn = document.getElementById('menu-close-btn');

    // Funciones que añaden/quitan clases directamente a los elementos
    const openMenu = () => {
        if (sideMenu) sideMenu.classList.add('menu-open');
        if (mainContent) mainContent.classList.add('content-shifted');
    };
    const closeMenu = () => {
        if (sideMenu) sideMenu.classList.remove('menu-open');
        if (mainContent) mainContent.classList.remove('content-shifted');
    };

    // ABRIR: Solo al pasar el mouse sobre el ÍCONO
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('mouseover', openMenu);
    }

    // CERRAR: Al quitar el mouse del ÁREA DEL MENÚ o al hacer clic en la 'X'
    if (sideMenu) {
        sideMenu.addEventListener('mouseleave', closeMenu);
    }
    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', closeMenu);
    }
    
    // --- LÓGICA PARA ABM DE USUARIOS (Event Listeners) ---
    const usersListContainer = document.getElementById('users-list-container');
    const userForm = document.getElementById('user-form');
    const addNewUserBtn = document.getElementById('add-new-user-btn');

    if (addNewUserBtn) addNewUserBtn.addEventListener('click', () => openUserFormModal());
    
    if (usersListContainer) {
        usersListContainer.addEventListener('click', async (e) => {
            const userRow = e.target.closest('tr');
            if (!userRow) return;
            const userId = userRow.dataset.userId;

            if (e.target.classList.contains('delete-user-btn')) {
                if (confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${userId}?`)) {
                    try {
                        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        alert(result.message);
                        fetchUsers();
                    } catch (error) { alert(`Error: ${error.message}`); }
                }
            }
            if (e.target.classList.contains('edit-user-btn')) {
                try {
                    const response = await fetch(`/api/users/${userId}`, { credentials: 'include' });
                    if (!response.ok) throw new Error('No se pudieron cargar los datos del usuario.');
                    const userData = await response.json();
                    openUserFormModal(userData);
                } catch (error) { alert(`Error: ${error.message}`); }
            }
        });
    }

    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('user-id').value;
            const isEditing = !!userId;
            const password = document.getElementById('user-password').value;
            const data = {
                nombre: document.getElementById('user-nombre').value,
                apellido: document.getElementById('user-apellido').value,
                username: document.getElementById('user-username').value,
                role: document.getElementById('user-role').value,
            };
            if (password) data.password = password;
            if (!isEditing && !password) return alert('La contraseña es obligatoria para usuarios nuevos.');
    
            const url = isEditing ? `/api/users/${userId}` : '/api/users';
            const method = isEditing ? 'PUT' : 'POST';
    
            try {
                const response = await fetch(url, {
                    method: method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert(result.message);
                closeModal(document.getElementById('user-form-modal'));
                fetchUsers();
            } catch (error) {
                alert(`Error al guardar: ${error.message}`);
            }
        });
    }

    // --- LÓGICA PARA CAMBIO DE CONTRASEÑA ---
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessageP = document.getElementById('change-password-error');
            errorMessageP.textContent = '';
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password-change').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            if (newPassword !== confirmNewPassword) {
                errorMessageP.textContent = 'Las nuevas contraseñas no coinciden.';
                return;
            }
            try {
                const response = await fetch('/api/users/change-password', {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert(result.message);
                changePasswordForm.reset();
                closeModal(document.getElementById('change-password-modal'));
            } catch(error) {
                errorMessageP.textContent = error.message;
            }
        });
    }
});