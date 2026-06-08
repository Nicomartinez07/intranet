document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('searchDir');
    const container = document.getElementById('dirContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noResults = document.getElementById('noResults');

    let directoryData = []; // Raw flattened rows from DB
    let groupedData = {}; // Grouped by dependencia
    let isLoggedIn = false;
    let userRole = null;

    // Verificar sesión al inicio
    try {
        const resp = await fetch('/api/status', { credentials: 'include' });
        if (resp.ok) {
            const session = await resp.json();
            isLoggedIn = session.loggedIn;
            userRole = isLoggedIn ? session.user.role : null;
        }
    } catch (e) { }

    // Fetch data from API
    fetch('/api/directorio')
        .then(response => response.json())
        .then(data => {
            directoryData = data;
            groupedData = groupData(directoryData);
            loadingIndicator.style.display = 'none';
            renderDirectory(groupedData);
        })
        .catch(err => {
            console.error('Error fetching directory:', err);
            loadingIndicator.innerText = 'Error al cargar el directorio.';
            loadingIndicator.style.display = 'block';
        });

    // Grouping rows by dependencia_name
    function groupData(rows) {
        return rows.reduce((acc, row) => {
            const depName = row.dep_nombre || 'Desconocida';
            if (!acc[depName]) {
                acc[depName] = {
                    depName,
                    dependencia_id: row.dependencia_id,
                    responsable: row.dep_responsable,
                    offices: []
                };
            }
            if (row.oficina_id) {
                acc[depName].offices.push({
                    oficina_id: row.oficina_id,
                    oficinaName: row.oficina_nombre,
                    piso: row.piso,
                    interno: row.interno,
                    oficinaResponsable: row.oficina_responsable
                });
            }
            return acc;
        }, {});
    }

    // Render the container
    function renderDirectory(grouped) {
        container.innerHTML = '';
        const groups = Object.values(grouped);

        if (groups.length === 0) {
            noResults.style.display = 'block';
            return;
        } else {
            noResults.style.display = 'none';
        }

        const canEdit = isLoggedIn && (userRole === 'admin' || userRole === 'tecnico');

        // Render add button on header if allowed
        if (canEdit && !document.getElementById('add-dep-btn')) {
            const header = document.querySelector('.directory-header');
            header.insertAdjacentHTML('beforeend', `<button id="add-dep-btn" class="save-coeficiente-btn" style="margin-top:15px; font-size:1rem;">➕ Añadir Nueva Dependencia</button>`);
        }

        groups.forEach(group => {
            const editDepBtn = canEdit ? `<button class="edit-btn edit-dep-btn" title="Editar Dependencia" data-id="${group.dependencia_id}" data-name="${escapeHtml(group.depName)}">✏️</button>` : '';
            const delDepBtn = canEdit ? `<button class="edit-btn del-dep-btn" title="Eliminar Dependencia" data-id="${group.dependencia_id}">🗑️</button>` : '';
            const addOfiBtn = canEdit ? `<button class="edit-btn add-ofi-btn" title="Añadir Oficina" data-id="${group.dependencia_id}">➕</button>` : '';

            const officesHtml = group.offices.length === 0 ? '<li class="office-item">Sin oficinas registradas</li>' :
                group.offices.map(office => {
                    const editOfiBtn = canEdit ? `<button class="edit-btn edit-office-btn" title="Editar Oficina" data-id="${office.oficina_id}" data-name="${escapeHtml(office.oficinaName)}" data-piso="${escapeHtml(office.piso)}" data-interno="${escapeHtml(office.interno)}">✏️</button>` : '';
                    const delOfiBtn = canEdit ? `<button class="edit-btn del-office-btn" title="Eliminar Oficina" data-id="${office.oficina_id}">🗑️</button>` : '';
                    return `
                        <li class="office-item">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <span class="office-name">${escapeHtml(office.oficinaName || 'Sin Nombre')}</span>
                                <div>
                                    ${editOfiBtn}
                                    ${delOfiBtn}
                                </div>
                            </div>
                            <div class="office-details">
                                <div class="detail-item ofi-piso-container">
                                    🏢 Piso: <strong class="ofi-piso">${escapeHtml(office.piso || '-')}</strong>
                                </div>
                                <div class="detail-item ofi-int-container">
                                    📞 Int: <span class="phone-badge ofi-int">${escapeHtml(office.interno || '-')}</span>
                                </div>
                            </div>
                        </li>
                    `;
                }).join('');

            const cardItemMarkup = `
                <div class="dep-card" data-dep-id="${group.dependencia_id}">
                    <div class="dep-card-header" style="justify-content: space-between;">
                        <h3 class="dep-name-text" style="flex-grow:1; margin-right:5px;">${escapeHtml(group.depName)}</h3>
                        <div>
                            ${addOfiBtn}
                            ${editDepBtn}
                            ${delDepBtn}
                        </div>
                    </div>
                    <ul class="dep-card-body">
                        ${officesHtml}
                    </ul>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardItemMarkup);
        });
    }

    // Search filter event listener
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (!term) {
            renderDirectory(groupedData);
            return;
        }

        const filteredGroups = {};

        Object.values(groupedData).forEach(group => {
            const depMatch = group.depName.toLowerCase().includes(term);
            const matchedOffices = group.offices.filter(off => {
                const offMatch = off.oficinaName && off.oficinaName.toLowerCase().includes(term);
                const intMatch = off.interno && String(off.interno).toLowerCase().includes(term);
                const pisoMatch = off.piso && String(off.piso).toLowerCase().includes(term);
                return offMatch || intMatch || pisoMatch;
            });

            if (depMatch) {
                filteredGroups[group.depName] = group;
            } else if (matchedOffices.length > 0) {
                filteredGroups[group.depName] = {
                    ...group,
                    offices: matchedOffices
                };
            }
        });

        renderDirectory(filteredGroups);
    });

    // Inline Editing Logic
    container.addEventListener('click', async (e) => {
        // Edit Dependencia
        if (e.target.classList.contains('edit-dep-btn')) {
            const btn = e.target;
            const cardHeader = btn.closest('.dep-card-header');
            const h3 = cardHeader.querySelector('.dep-name-text');
            h3.innerHTML = `<input type="text" class="edit-input" value="${btn.dataset.name}" style="width:100%;">`;
            btn.classList.replace('edit-dep-btn', 'save-dep-btn');
            btn.innerHTML = '💾';
            return;
        }

        // Save Dependencia
        if (e.target.classList.contains('save-dep-btn')) {
            const btn = e.target;
            const cardHeader = btn.closest('.dep-card-header');
            const input = cardHeader.querySelector('.edit-input');
            const newName = input.value.trim();
            const id = btn.dataset.id;

            try {
                const resp = await fetch(`/api/dependencias/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dep_nombre: newName })
                });
                if (resp.ok) {
                    btn.dataset.name = newName;
                    cardHeader.querySelector('.dep-name-text').innerText = newName;
                    btn.classList.replace('save-dep-btn', 'edit-dep-btn');
                    btn.innerHTML = '✏️';

                    const oldKey = Object.keys(groupedData).find(k => groupedData[k].dependencia_id == id);
                    if (oldKey) {
                        groupedData[oldKey].depName = newName;
                        if (oldKey !== newName) {
                            groupedData[newName] = groupedData[oldKey];
                            delete groupedData[oldKey];
                        }
                    }
                } else { alert('Error al guardar la dependencia.'); }
            } catch (error) { alert('Error de conexión.'); }
            return;
        }

        // Delete Dependencia
        if (e.target.classList.contains('del-dep-btn')) {
            if (!confirm('¿Estás seguro de eliminar esta dependencia y todas sus oficinas?')) return;
            const btn = e.target;
            try {
                const resp = await fetch(`/api/dependencias/${btn.dataset.id}`, { method: 'DELETE' });
                if (resp.ok) { window.location.reload(); }
            } catch (e) { }
        }

        // Add Oficina
        if (e.target.classList.contains('add-ofi-btn')) {
            const depId = e.target.dataset.id;
            const nombre = prompt('Nombre de la nueva oficina:');
            if (!nombre) return;
            const piso = prompt('Piso (ej. PB):') || '';
            const interno = prompt('Teléfono interno:') || '';
            try {
                const resp = await fetch('/api/oficinas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_dependencia: depId, ofi_oficina: nombre, ofi_ubicacion: piso, ofi_nronuevo: interno })
                });
                if (resp.ok) { window.location.reload(); }
            } catch (e) { }
        }

        // Edit Oficina
        if (e.target.classList.contains('edit-office-btn')) {
            const btn = e.target;
            const listItem = btn.closest('.office-item');
            const spanName = listItem.querySelector('.office-name');

            spanName.innerHTML = `<input type="text" class="edit-input edit-ofi-name" value="${btn.dataset.name}" style="width:100%; margin-bottom:5px;">`;
            listItem.querySelector('.ofi-piso-container').innerHTML = `Piso: <input type="text" class="edit-input edit-ofi-piso" value="${btn.dataset.piso}" style="width:50px">`;
            listItem.querySelector('.ofi-int-container').innerHTML = `Int: <input type="text" class="edit-input edit-ofi-int" value="${btn.dataset.interno}" style="width:70px">`;

            btn.classList.replace('edit-office-btn', 'save-office-btn');
            btn.innerHTML = '💾';
            return;
        }

        // Save Oficina
        if (e.target.classList.contains('save-office-btn')) {
            const btn = e.target;
            const listItem = btn.closest('.office-item');

            const newName = listItem.querySelector('.edit-ofi-name').value.trim();
            const newPiso = listItem.querySelector('.edit-ofi-piso').value.trim();
            const newInt = listItem.querySelector('.edit-ofi-int').value.trim();
            const id = btn.dataset.id;

            try {
                const resp = await fetch(`/api/oficinas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ofi_oficina: newName, ofi_ubicacion: newPiso, ofi_nronuevo: newInt })
                });
                if (resp.ok) {
                    btn.dataset.name = newName;
                    btn.dataset.piso = newPiso;
                    btn.dataset.interno = newInt;

                    listItem.querySelector('.office-name').innerText = newName;
                    listItem.querySelector('.ofi-piso-container').innerHTML = `🏢 Piso: <strong class="ofi-piso">${escapeHtml(newPiso)}</strong>`;
                    listItem.querySelector('.ofi-int-container').innerHTML = `📞 Int: <span class="phone-badge ofi-int">${escapeHtml(newInt)}</span>`;

                    btn.classList.replace('save-office-btn', 'edit-office-btn');
                    btn.innerHTML = '✏️';

                    const targetGroup = Object.values(groupedData).find(g => g.offices.some(o => o.oficina_id == id));
                    if (targetGroup) {
                        const targetOfi = targetGroup.offices.find(o => o.oficina_id == id);
                        targetOfi.oficinaName = newName;
                        targetOfi.piso = newPiso;
                        targetOfi.interno = newInt;
                    }
                } else { alert('Error al guardar la oficina.'); }
            } catch (error) { alert('Error de conexión.'); }
        }

        // Delete Oficina
        if (e.target.classList.contains('del-office-btn')) {
            if (!confirm('¿Estás seguro de eliminar esta oficina?')) return;
            const btn = e.target;
            try {
                const resp = await fetch(`/api/oficinas/${btn.dataset.id}`, { method: 'DELETE' });
                if (resp.ok) { window.location.reload(); }
            } catch (e) { }
        }
    });

    // Add Dependencia General
    document.addEventListener('click', async (e) => {
        if (e.target.id === 'add-dep-btn') {
            const nombre = prompt('Nombre de la nueva dependencia:');
            if (!nombre) return;
            try {
                const resp = await fetch('/api/dependencias', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dep_nombre: nombre })
                });
                if (resp.ok) { window.location.reload(); }
            } catch (e) { }
        }
    });

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
