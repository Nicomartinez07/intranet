document.addEventListener('DOMContentLoaded', () => {
    // === SELECTORES ESPECÍFICOS DEL DASHBOARD ===
    const sidebarNav = document.getElementById('sidebar-nav');
    const ticketsList = document.getElementById('tickets-list');
    const ticketTable = document.querySelector('.ticket-table');
    const newTicketButton = document.getElementById('open-new-ticket-form');
    const manageProblemsModal = document.getElementById('manage-problems-modal');
    const adminTicketChoiceDiv = document.getElementById('admin-ticket-choice');
    const techFormDiv = document.getElementById('tech-support-form-dashboard');
    const servicesFormDiv = document.getElementById('services-support-form-dashboard');
    const adminTicketSelector = document.getElementById('ticket-type-selector');
    const submitTechForm = document.getElementById('submit-tech-ticket-dashboard');
    const submitServicesForm = document.getElementById('submit-services-ticket-dashboard');
    const problemTypeSelector = document.getElementById('problem-type-selector');
    const problemsListContainer = document.getElementById('problems-list-container');
    const newProblemNameInput = document.getElementById('new-problem-name');
    const addProblemBtn = document.getElementById('add-problem-btn');
    
    let userRole = null;

    // =================================================
    // PASO 1: DECLARACIÓN DE TODAS LAS FUNCIONES
    // =================================================

    function addAdminSidebarFeatures() {
        if (!sidebarNav) return;
        const manageProblemsBtn = document.createElement('button');
        manageProblemsBtn.className = 'menu-button';
        manageProblemsBtn.innerHTML = '🔧 Gestionar Problemas';
        manageProblemsBtn.addEventListener('click', openManageProblemsModal);
        sidebarNav.appendChild(manageProblemsBtn);
    }
    
    async function fetchTickets() {
        if (!ticketsList) return;
        try {
            const response = await fetch('/api/tickets', { credentials: 'include' });
            if (!response.ok) throw new Error('Error al cargar tickets');
            const tickets = await response.json();
            ticketsList.innerHTML = '';
            tickets.forEach(ticket => {
                const row = document.createElement('tr');
                let statusOptions = '';
                const statusList = ticket.ticket_type === 'Solicitud de Aula' 
                    ? ['Solicitada', 'Aprobada', 'Rechazada'] 
                    : ['Abierto', 'En Proceso', 'Cerrado'];
                statusList.forEach(s => {
                    statusOptions += `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${s}</option>`;
                });
                row.innerHTML = `
                    <td>${ticket.id}</td>
                    <td>${ticket.solicitante_nombre}</td>
                    <td>${ticket.dependencia_nombre || 'N/A'}</td>
                    <td>${ticket.ticket_type}</td>
                    <td>${ticket.problema}</td>
                    <td><select class="status-selector status-${ticket.status.toLowerCase().replace(/ /g, '-').replace('ó', 'o')}" data-ticket-id="${ticket.id}">${statusOptions}</select></td>
                    <td>${new Date(ticket.created_at).toLocaleString()}</td>
                `;
                ticketsList.appendChild(row);
            });
        } catch (error) {
            console.error(error.message);
            window.location.href = '/'; 
        }
    }

    const hideTicketForms = () => {
        if (techFormDiv) techFormDiv.style.display = 'none';
        if (servicesFormDiv) servicesFormDiv.style.display = 'none';
        if (adminTicketChoiceDiv) adminTicketChoiceDiv.style.display = 'none';
        if (ticketTable) ticketTable.style.display = 'table';
        if (newTicketButton) newTicketButton.style.display = 'block';
    };
    
    const handleDashboardFormSubmit = async (e, form) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/api/tickets', {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('¡Pedido enviado con éxito!');
            form.reset();
            hideTicketForms();
            fetchTickets();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    async function populateProblemSelects() {
        document.querySelectorAll('.problema-select').forEach(async (select) => {
            const ticketType = select.dataset.ticketType;
            if(!ticketType) return;
            select.innerHTML = '<option value="">Cargando...</option>';
            try {
                const response = await fetch(`/api/problemas?ticket_type=${encodeURIComponent(ticketType)}`, { credentials: 'include' });
                const problemas = await response.json();
                select.innerHTML = '<option value="">Seleccione un problema...</option>';
                problemas.forEach(prob => {
                    select.innerHTML += `<option value="${prob.problema_nombre}">${prob.problema_nombre}</option>`;
                });
            } catch (error) {
                select.innerHTML = '<option value="">Error al cargar</option>';
            }
        });
    }

    function openManageProblemsModal() {
        const managedTypes = {
            'admin': ['Soporte Técnico', 'Servicios Generales', 'Solicitud de Aula', 'Soporte Electromecánico'],
            'tecnico': ['Soporte Técnico'],
            'servicios': ['Servicios Generales'],
            'mecanica': ['Soporte Electromecánico'],
            'editor': ['Solicitud de Aula']
        }[userRole] || [];
        
        problemTypeSelector.innerHTML = '<option value="" selected disabled>Selecciona una categoría...</option>';
        managedTypes.forEach(type => problemTypeSelector.innerHTML += `<option value="${type}">${type}</option>`);
        problemsListContainer.innerHTML = '<p>Selecciona una categoría para ver los problemas.</p>';
        newProblemNameInput.value = '';
        openModal(manageProblemsModal);
    }

    async function loadProblemsForType(ticketType) {
        if (!ticketType) return;
        problemsListContainer.innerHTML = '<p>Cargando...</p>';
        try {
            const response = await fetch(`/api/problemas?ticket_type=${encodeURIComponent(ticketType)}`, { credentials: 'include' });
            if (!response.ok) throw new Error('No se pudieron cargar los problemas.');
            const problems = await response.json();
            if (problems.length === 0) {
                problemsListContainer.innerHTML = '<p>No hay problemas definidos para esta categoría.</p>';
            } else {
                problemsListContainer.innerHTML = `<ul class="problems-list">${problems.map(p => `
                    <li data-id="${p.id}">
                        <span class="problem-text">${p.problema_nombre}</span>
                        <input type="text" class="problem-input" value="${p.problema_nombre}" style="display: none;">
                        <div class="problem-actions">
                            <button class="edit-problem-btn">Editar</button>
                            <button class="save-problem-btn" style="display: none;">Guardar</button>
                            <button class="delete-problem-btn">Borrar</button>
                        </div>
                    </li>`).join('')}</ul>`;
            }
        } catch (error) {
            problemsListContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    // ================================================
    // PASO 2: LÓGICA DE INICIALIZACIÓN DE LA PÁGINA
    // ================================================
    
    (async function initializePage() {
        try {
            const statusResponse = await fetch('/api/status', { credentials: 'include' });
            if (!statusResponse.ok) throw new Error('No autenticado');
            const data = await statusResponse.json();
            
            if (data.loggedIn) {
                userRole = data.user.role;
                buildHeaderControls(data, 'dashboard');
                if (userRole === 'admin') {
                    addAdminSidebarFeatures();
                }
                fetchTickets();
                populateProblemSelects();
                setupEventListeners();
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error de inicialización en Dashboard:', error);
            window.location.href = '/';
        }
    })();

    // =================================================
    // PASO 3: ASIGNACIÓN DE TODOS LOS EVENT LISTENERS
    // =================================================

    function setupEventListeners() {
        if (newTicketButton) newTicketButton.addEventListener('click', () => {
            ticketTable.style.display = 'none';
            newTicketButton.style.display = 'none';
            if (userRole === 'admin') {
                adminTicketChoiceDiv.style.display = 'block';
            } else if (userRole === 'tecnico') {
                techFormDiv.style.display = 'block';
            } else if (userRole === 'servicios') {
                servicesFormDiv.style.display = 'block';
            }
        });

        if (adminTicketSelector) adminTicketSelector.addEventListener('change', function() {
            const selection = this.value;
            const selectedText = this.options[this.selectedIndex].text;
            adminTicketChoiceDiv.style.display = 'none';
            let targetFormDiv = null;
            if (['tecnico', 'aula', 'electromecanico'].includes(selection)) targetFormDiv = techFormDiv;
            else if (selection === 'servicios') targetFormDiv = servicesFormDiv;
            if (targetFormDiv) {
                const titleElement = targetFormDiv.querySelector('h2');
                if (titleElement) titleElement.textContent = `Nuevo Pedido: ${selectedText}`;
                const hiddenInput = targetFormDiv.querySelector('input[name="ticket_type"]');
                if (hiddenInput) hiddenInput.value = selectedText;
                const problemSelect = targetFormDiv.querySelector('.problema-select');
                if (problemSelect) {
                    problemSelect.dataset.ticketType = selectedText;
                    populateProblemSelects();
                }
                targetFormDiv.style.display = 'block';
            }
        });

        document.querySelectorAll('.hidden-form .cancel-button').forEach(button => button.addEventListener('click', hideTicketForms));
        if (submitTechForm) submitTechForm.addEventListener('submit', (e) => handleDashboardFormSubmit(e, submitTechForm));
        if (submitServicesForm) submitServicesForm.addEventListener('submit', (e) => handleDashboardFormSubmit(e, submitServicesForm));
        
        if (ticketsList) ticketsList.addEventListener('change', async (event) => {
            if (event.target.classList.contains('status-selector')) {
                const selectElement = event.target;
                const ticketId = selectElement.dataset.ticketId;
                const newStatus = selectElement.value;
                try {
                    const response = await fetch(`/api/tickets/${ticketId}/status`, {
                        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    selectElement.className = 'status-selector';
                    selectElement.classList.add(`status-${newStatus.toLowerCase().replace(/ /g, '-').replace('ó', 'o')}`);
                } catch (error) {
                    alert(`Error: ${error.message}`);
                    fetchTickets(); 
                }
            }
        });
        
        if (problemTypeSelector) problemTypeSelector.addEventListener('change', () => loadProblemsForType(problemTypeSelector.value));
        if (addProblemBtn) addProblemBtn.addEventListener('click', async () => {
            const ticketType = problemTypeSelector.value;
            const problemName = newProblemNameInput.value.trim();
            if (!ticketType || !problemName) return alert('Selecciona una categoría y escribe un nombre para el problema.');
            await fetch('/api/problemas', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_type: ticketType, problema_nombre: problemName }) });
            newProblemNameInput.value = '';
            loadProblemsForType(ticketType);
        });
        
        if (problemsListContainer) problemsListContainer.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const id = li.dataset.id;
            const problemText = li.querySelector('.problem-text');
            const problemInput = li.querySelector('.problem-input');
            if (e.target.classList.contains('edit-problem-btn')) {
                problemText.style.display = 'none';
                problemInput.style.display = 'inline-block';
                e.target.style.display = 'none';
                li.querySelector('.save-problem-btn').style.display = 'inline-block';
                problemInput.focus();
            }
            if (e.target.classList.contains('save-problem-btn')) {
                await fetch(`/api/problemas/${id}`, {
                    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ problema_nombre: problemInput.value })
                });
                loadProblemsForType(problemTypeSelector.value);
            }
            if (e.target.classList.contains('delete-problem-btn')) {
                if (confirm('¿Estás seguro de que quieres eliminar este problema?')) {
                    await fetch(`/api/problemas/${id}`, { method: 'DELETE', credentials: 'include' });
                    loadProblemsForType(problemTypeSelector.value);
                }
            }
        });
        
        document.querySelectorAll('.modal .close-button').forEach(btn => {
            btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal')));
        });

        // Enganche para abrir el modal de usuarios (cuya lógica está en shared.js)
        window.addEventListener('openManageUsers', openManageUsersModal);
    }
});