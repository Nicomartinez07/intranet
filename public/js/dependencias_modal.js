document.addEventListener('DOMContentLoaded', () => {
    const openBtns = document.querySelectorAll('#open-dependencias-modal-btn, .open-dependencias-btn');
    if (openBtns.length === 0) return;

    const modal = document.getElementById('dependencias-dir-modal');
    const closeBtn = modal.querySelector('.close-button');
    const container = document.getElementById('modalDirContainer');
    const loadingIndicator = document.getElementById('modalLoadingIndicator');
    const noResults = document.getElementById('modalNoResults');
    const searchInput = document.getElementById('modalSearchDir');
    const paginationContainer = document.getElementById('modalPaginationContainer');

    let directoryData = [];
    let groupedData = {};
    let filteredGroupsList = [];
    let currentPage = 1;
    const itemsPerPage = 4; // Changed per request

    openBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (directoryData.length === 0) {
                fetchDirectory();
            }
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    function fetchDirectory() {
        loadingIndicator.style.display = 'block';
        
        // Fetch auth status to show edit button if logged in
        fetch('/api/status', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.loggedIn && !document.getElementById('edit-dir-btn')) {
                    const titleContainer = document.getElementById('modal-deps-title-container');
                    const editBtn = document.createElement('a');
                    editBtn.id = 'edit-dir-btn';
                    editBtn.href = '/dependencias';
                    editBtn.style = 'background-color: var(--accent-color); color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.9em; font-weight: bold; transition: background-color 0.2s;';
                    editBtn.innerHTML = '✏️ Editar Directorio';
                    editBtn.onmouseover = () => editBtn.style.backgroundColor = 'var(--accent-hover)';
                    editBtn.onmouseout = () => editBtn.style.backgroundColor = 'var(--accent-color)';
                    if (titleContainer) titleContainer.appendChild(editBtn);
                }
            })
            .catch(err => console.error('Status fetch error:', err));

        fetch('/api/directorio')
            .then(response => response.json())
            .then(data => {
                directoryData = data;
                groupedData = groupData(directoryData);
                filteredGroupsList = Object.values(groupedData);
                loadingIndicator.style.display = 'none';
                renderPage(1);
            })
            .catch(err => {
                console.error('Error fetching directory:', err);
                loadingIndicator.innerText = 'Error al cargar el directorio.';
            });
    }

    function groupData(rows) {
        return rows.reduce((acc, row) => {
            const depName = row.dep_nombre || 'Desconocida';
            if (!acc[depName]) {
                acc[depName] = {
                    depName,
                    dependencia_id: row.dependencia_id,
                    offices: []
                };
            }
            if (row.oficina_id) {
                acc[depName].offices.push({
                    oficina_id: row.oficina_id,
                    oficinaName: row.oficina_nombre,
                    piso: row.piso,
                    interno: row.interno
                });
            }
            return acc;
        }, {});
    }

    function renderPage(page) {
        currentPage = page;
        container.innerHTML = '';
        
        if (filteredGroupsList.length === 0) {
            noResults.style.display = 'block';
            paginationContainer.innerHTML = '';
            return;
        } else {
            noResults.style.display = 'none';
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const groupsToShow = filteredGroupsList.slice(startIndex, endIndex);

        groupsToShow.forEach(group => {
            const officesHtml = group.offices.length === 0 ? '<li class="office-item">Sin oficinas registradas</li>' :
                group.offices.map(office => {
                    return `
                        <li class="office-item">
                            <span class="office-name">${escapeHtml(office.oficinaName || 'Sin Nombre')}</span>
                            <div class="office-details">
                                <div class="detail-item">
                                    🏢 Piso: <strong>${escapeHtml(office.piso || '-')}</strong>
                                </div>
                                <div class="detail-item">
                                    📞 Int: <span class="phone-badge">${escapeHtml(office.interno || '-')}</span>
                                </div>
                            </div>
                        </li>
                    `;
                }).join('');

            const cardItemMarkup = `
                <div class="dep-card" data-dep-id="${group.dependencia_id}">
                    <div class="dep-card-header">
                        <h3>${escapeHtml(group.depName)}</h3>
                    </div>
                    <ul class="dep-card-body">
                        ${officesHtml}
                    </ul>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardItemMarkup);
        });

        renderPagination();
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredGroupsList.length / itemsPerPage);
        
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.classList.add('page-btn');
        prevBtn.innerText = 'Anterior';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => renderPage(currentPage - 1);
        paginationContainer.appendChild(prevBtn);

        // Display up to 5 page numbers (basic sliding window if needed, but for now simple)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (endPage - startPage < 4) {
            if (startPage === 1) endPage = Math.min(totalPages, 5);
            else if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.classList.add('page-btn');
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.innerText = i;
            pageBtn.onclick = () => renderPage(i);
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.classList.add('page-btn');
        nextBtn.innerText = 'Siguiente';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => renderPage(currentPage + 1);
        paginationContainer.appendChild(nextBtn);
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (!term) {
            filteredGroupsList = Object.values(groupedData);
            renderPage(1);
            return;
        }

        const filtered = [];
        Object.values(groupedData).forEach(group => {
            const depMatch = group.depName.toLowerCase().includes(term);
            const matchedOffices = group.offices.filter(off => {
                const offMatch = off.oficinaName && off.oficinaName.toLowerCase().includes(term);
                const intMatch = off.interno && String(off.interno).toLowerCase().includes(term);
                const pisoMatch = off.piso && String(off.piso).toLowerCase().includes(term);
                return offMatch || intMatch || pisoMatch;
            });

            if (depMatch) {
                filtered.push(group);
            } else if (matchedOffices.length > 0) {
                filtered.push({
                    ...group,
                    offices: matchedOffices
                });
            }
        });

        filteredGroupsList = filtered;
        renderPage(1);
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
