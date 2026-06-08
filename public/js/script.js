document.addEventListener('DOMContentLoaded', async () => {
    // === SELECTORES DE ELEMENTOS (Página Principal) ===
    const loginModal = document.getElementById('login-modal');
    const ticketModal = document.getElementById('ticket-modal');
    const downloadsModal = document.getElementById('downloads-modal');

    const finanzasModal = document.getElementById('finanzas-modal');
    const changePasswordModal = document.getElementById('change-password-modal'); // Necesario para el header

    // Botones para abrir modales
    const openTicketButtons = document.querySelectorAll('.option-box[data-ticket-type]');
    const openDownloadsModalBtn = document.getElementById('open-downloads-modal-btn');

    const openFinanzasBtn = document.getElementById('open-finanzas-modal-btn');

    // Formularios y sus contenedores
    const loginForm = document.getElementById('login-form');
    const ticketForm = document.getElementById('ticket-form');
    const finanzasTableContainer = document.getElementById('finanzas-table-container');
    const finanzasFooter = document.getElementById('finanzas-footer');


    // Variables de estado
    let userRole = null;
    let isLoggedIn = false;
    let dependencias = [];

    // === LÓGICA DE INICIALIZACIÓN ===
    async function initializePage() {
        try {
            const response = await fetch('/api/status', { credentials: 'include' });
            if (!response.ok) throw new Error('Status check failed');
            const data = await response.json();
            isLoggedIn = data.loggedIn;
            userRole = data.loggedIn ? data.user.role : null;
            buildHeaderControls(data, 'index');
        } catch (error) {
            console.error("No se pudo verificar el estado de la sesión:", error);
            buildHeaderControls({ loggedIn: false }, 'index');
        }
    }

    async function fetchDependencias() {
        try {
            const response = await fetch('/api/dependencias', { credentials: 'include' });
            dependencias = await response.json();
        } catch (error) {
            console.error('Error al cargar dependencias:', error);
        }
    }

    async function loadFinanzasData() {
        finanzasTableContainer.innerHTML = '<p>Cargando datos...</p>';
        openModal(finanzasModal);
        try {
            const finanzasResponse = await fetch('/api/finanzas/tarjetas', { credentials: 'include' });
            if (!finanzasResponse.ok) throw new Error('No se pudieron cargar los datos.');
            const data = await finanzasResponse.json();
            if (data.length === 0) throw new Error("No hay datos para mostrar.");

            const isAdmin = isLoggedIn && userRole === 'admin';
            let tableHTML = `<table class="finanzas-table"><thead><tr><th>Cuotas</th><th>Financiamiento (%)</th>${isAdmin ? '<th>Acción</th>' : ''}</tr></thead><tbody>`;
            data.forEach(item => {
                tableHTML += `<tr><td>${item.cuotas}</td><td>${isAdmin ? `<input type="number" class="coeficiente-input" value="${item.coeficiente}" step="0.01" data-id="${item.id}">` : `${item.coeficiente}%`}</td>${isAdmin ? `<td><button class="save-coeficiente-btn" data-id="${item.id}">Guardar</button></td>` : ''}</tr>`;
            });
            tableHTML += '</tbody></table>';
            finanzasTableContainer.innerHTML = tableHTML;
            finanzasFooter.textContent = `Actualizado ${data[0].mes_actualizacion || 'N/A'}`;
        } catch (error) {
            finanzasTableContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    // === ASIGNACIÓN DE EVENTOS ===

    // Abrir Modales
    openTicketButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const ticketType = event.currentTarget.dataset.ticketType;
            ticketForm.reset();
            document.getElementById('ticket-modal-title').textContent = ticketType;
            document.getElementById('ticket-type').value = ticketType;

            const depSelect = document.getElementById('ticket-dependencia');
            depSelect.innerHTML = '<option value="">Seleccione una dependencia...</option>';
            dependencias.forEach(dep => depSelect.innerHTML += `<option value="${dep.id}">${dep.nombre}</option>`);

            const probSelect = document.getElementById('ticket-problema');
            probSelect.innerHTML = '<option value="">Cargando problemas...</option>';
            try {
                const response = await fetch(`/api/problemas?ticket_type=${encodeURIComponent(ticketType)}`, { credentials: 'include' });
                const problemas = await response.json();
                probSelect.innerHTML = '<option value="">Seleccione un problema...</option>';
                problemas.forEach(prob => probSelect.innerHTML += `<option value="${prob.problema_nombre}">${prob.problema_nombre}</option>`);
            } catch (error) {
                probSelect.innerHTML = '<option value="">Error al cargar</option>';
            }
            openModal(ticketModal);
        });
    });

    if (openDownloadsModalBtn) openDownloadsModalBtn.addEventListener('click', () => openModal(downloadsModal));
    if (openFinanzasBtn) openFinanzasBtn.addEventListener('click', loadFinanzasData);

    // Cerrar Modales
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', (event) => closeModal(event.target.closest('.modal')));
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) closeModal(event.target);
    });

    // === LÓGICA DE FORMULARIOS ===

    if (ticketForm) {
        ticketForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(ticketForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch('/api/tickets', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert('¡Pedido enviado con éxito!');
                ticketForm.reset();
                closeModal(ticketModal);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const errorMessage = document.getElementById('login-error-message');
            errorMessage.textContent = '';
            try {
                const response = await fetch('/api/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                window.location.href = result.redirectTo;
            } catch (error) {
                errorMessage.textContent = error.message;
            }
        });
    }

    if (finanzasTableContainer) {
        finanzasTableContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('save-coeficiente-btn')) {
                const button = event.target;
                const id = button.dataset.id;
                const input = finanzasTableContainer.querySelector(`.coeficiente-input[data-id="${id}"]`);
                button.textContent = 'Guardando...';
                button.disabled = true;
                try {
                    const response = await fetch(`/api/finanzas/tarjetas/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coeficiente: input.value }) });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                } catch (error) {
                    alert(`Error: ${error.message}`);
                } finally {
                    button.textContent = 'Guardar';
                    button.disabled = false;
                }
            }
        });
    }
    // === CORRECCIÓN: AÑADIMOS EL "RECEPTOR" PARA EL BOTÓN USUARIOS ===
    window.addEventListener('openManageUsers', () => {
        // La función openManageUsersModal vive en shared.js y está disponible globalmente
        if (typeof openManageUsersModal === 'function') {
            openManageUsersModal();
        }
    });
    // === INICIALIZACIÓN DE LA PÁGINA ===
    fetchDependencias();
    initializePage();
});