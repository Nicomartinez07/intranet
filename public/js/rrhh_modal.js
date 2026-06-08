document.addEventListener('DOMContentLoaded', () => {
    const rrhhModal = document.getElementById('rrhh-modal');
    const closeRrhhBtn = document.getElementById('close-rrhh-btn');
    const openRrhhBtn = document.getElementById('open-rrhh-modal-btn'); // Necesitamos este ID en index.ejs

    if (!rrhhModal) return;

    // Abrir Modal
    if (openRrhhBtn) {
        openRrhhBtn.addEventListener('click', () => {
            rrhhModal.style.display = 'flex';
            loadRRHHFiles();
        });
    }

    // Cerrar Modal
    if (closeRrhhBtn) {
        closeRrhhBtn.addEventListener('click', () => {
            rrhhModal.style.display = 'none';
        });
    }

    // Cerrar al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === rrhhModal) {
            rrhhModal.style.display = 'none';
        }
        if (downloadsModal && e.target === downloadsModal) {
            downloadsModal.style.display = 'none';
        }
    });

    const downloadsModal = document.getElementById('downloads-modal');
    const closeDownloadsBtn = document.getElementById('close-downloads-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-modal-btn');

    if (openDownloadsBtn && downloadsModal) {
        openDownloadsBtn.addEventListener('click', () => {
            // Se asume que script.js ya lo abre, pero aseguramos la carga
            loadRRHHFiles();
        });
    }

    if (closeDownloadsBtn && downloadsModal) {
        closeDownloadsBtn.addEventListener('click', () => {
            downloadsModal.style.display = 'none';
        });
    }

    let isAdminOrTecnico = false;

    async function loadRRHHFiles() {
        try {
            // Verificar estado para ver si es admin/tecnico
            const statusRes = await fetch('/api/status', { credentials: 'include' });
            const statusData = await statusRes.json();
            isAdminOrTecnico = statusData.loggedIn && (statusData.user.role === 'admin' || statusData.user.role === 'tecnico');

            await fetchAndRenderFiles('movimiento', 'rrhh-movimiento-container', 'rrhh-movimiento-upload');
            await fetchAndRenderFiles('admision', 'rrhh-admision-container', 'rrhh-admision-upload');
            await fetchAndRenderFiles('descargas', 'descargas-container', 'descargas-upload');
            await fetchAndRenderFiles('descargas_wifi', 'descargas_wifi-container', 'descargas_wifi-upload');

        } catch (error) {
            console.error('Error cargando RRHH:', error);
        }
    }

    function formatFileName(filename) {
        // Eliminar extensiones
        let name = filename.replace(/\.(pdf|doc|docx)$/i, '');
        // Reemplazar guiones bajos por espacios
        name = name.replace(/_/g, ' ');
        // Eliminar números al principio (ej: "12 PROPUESTA" -> "PROPUESTA")
        name = name.replace(/^\d+\s*/, '');
        // Opcional: Capitalizar la primera letra de cada palabra
        name = name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Excepciones para nombres que deben mantener mayúsculas u otros formatos específicos
        name = name.replace('Ad Honorem', 'Ad-Honorem');
        name = name.replace('Nodocente', 'NoDocente');
        
        return name;
    }

    async function fetchAndRenderFiles(category, containerId, uploadContainerId) {
        const container = document.getElementById(containerId);
        const uploadContainer = document.getElementById(uploadContainerId);
        container.innerHTML = '<p>Cargando archivos...</p>';
        
        try {
            const res = await fetch(`/api/rrhh/files?category=${category}`, { credentials: 'include' });
            let fetchedFiles = await res.json();
            
            container.innerHTML = '';
            if (fetchedFiles.length === 0) {
                container.innerHTML = '<p style="color: #64748b;">No hay formularios disponibles en esta sección.</p>';
            } else {
                fetchedFiles.forEach(file => {
                    const btnWrapper = document.createElement('div');
                    btnWrapper.style.display = 'flex';
                    btnWrapper.style.gap = '5px';
                    
                    const btn = document.createElement('a');
                    btn.href = file.url;
                    btn.target = '_blank';
                    btn.className = 'rrhh-btn';
                    btn.style.flexGrow = '1';
                    
                    const displayName = formatFileName(file.name);
                    
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>
                        <span class="rrhh-btn-text">${displayName}</span>
                    `;
                    
                    btnWrapper.appendChild(btn);

                    // Ahora permitimos eliminar todos los archivos reales que provienen del servidor
                    if (isAdminOrTecnico) {
                        const delBtn = document.createElement('button');
                        delBtn.className = 'rrhh-admin-btn';
                        delBtn.title = 'Eliminar archivo';
                        delBtn.innerHTML = '🗑️';
                        delBtn.onclick = () => deleteFile(category, file.name);
                        btnWrapper.appendChild(delBtn);
                    }
                    
                    container.appendChild(btnWrapper);
                });
            }

            // Render Upload controls if Admin
            uploadContainer.innerHTML = '';
            if (isAdminOrTecnico) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.pdf,.doc,.docx';
                fileInput.id = `upload-${category}`;
                fileInput.className = 'rrhh-file-input';
                
                const uploadBtn = document.createElement('button');
                uploadBtn.className = 'rrhh-upload-btn';
                uploadBtn.innerText = 'Subir Nuevo PDF';
                uploadBtn.onclick = () => uploadFile(category, fileInput);

                uploadContainer.appendChild(fileInput);
                uploadContainer.appendChild(uploadBtn);
            }

        } catch (error) {
            container.innerHTML = '<p style="color: red;">Error al cargar archivos.</p>';
        }
    }

    async function deleteFile(category, filename) {
        if (!confirm(`¿Estás seguro de que deseas eliminar ${filename}?`)) return;
        
        try {
            const res = await fetch(`/api/rrhh/files/${encodeURIComponent(filename)}?category=${category}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                loadRRHHFiles();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error de conexión');
        }
    }

    async function uploadFile(category, inputElement) {
        if (!inputElement.files || inputElement.files.length === 0) {
            return alert('Por favor, selecciona un archivo PDF primero.');
        }

        const formData = new FormData();
        formData.append('pdf', inputElement.files[0]);

        try {
            const res = await fetch(`/api/rrhh/upload?category=${category}`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                alert('Archivo subido con éxito');
                inputElement.value = ''; // clear input
                loadRRHHFiles();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error de conexión al subir el archivo');
        }
    }
});
