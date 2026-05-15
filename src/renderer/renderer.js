document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar iconos
    if (window.lucide) {
        lucide.createIcons();
    }

    // --- Control de Pantalla de Carga ---
    const loadingScreen = document.getElementById('loading-screen');
    const loadingStatus = document.getElementById('loading-status-text');
    const loadingProgress = document.getElementById('loading-progress-inner');

    const updateLoading = (text, progress) => {
        if (loadingStatus) loadingStatus.innerText = text;
        if (loadingProgress) loadingProgress.style.width = `${progress}%`;
    };

    window.contactarCliente = (phone, cliente, equipo) => {
        const message = encodeURIComponent(`Hola ${cliente}, te escribimos de MLA POS sobre tu equipo ${equipo}...`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    // Selectores Principales
    const formServicio = document.getElementById('servicio-form');
    const formPrecio = document.getElementById('precio-form');
    const serviciosGrid = document.getElementById('servicios-grid');
    const pendientesGrid = document.getElementById('pendientes-grid');
    const preciosGrid = document.getElementById('precios-grid');
    const quickPricesList = document.getElementById('quick-prices-list');
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const searchInput = document.getElementById('search-input');
    const searchPendientes = document.getElementById('search-pendientes');
    const notificationContainer = document.getElementById('notification-container');

    // Elementos de Ficha y Autocompletado Custom
    const inputEquipo = document.getElementById('equipo');
    const textareaFicha = document.getElementById('ficha-tecnica');
    const autocompleteList = document.getElementById('autocomplete-list');

    // Selectores Múltiples Servicios
    const selectedServicesContainer = document.getElementById('selected-services-container');
    const selectedServicesList = document.getElementById('selected-services-list');
    const totalDisplay = document.getElementById('total-display');
    
    // Selectores Múltiples Equipos
    const selectedEquipmentContainer = document.getElementById('selected-equipment-container');
    const selectedEquipmentList = document.getElementById('selected-equipment-list');
    
    // Filtros de Fecha
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');

    let allServicios = [];
    let allPrecios = [];
    let allModelos = [];
    let currentSelectedServices = [];
    let currentSelectedEquipment = [];
    let currentFocus = -1;
    let editingPrecioId = null;
    let editingServicioId = null;
    let editingGrupoId = null;
    let currentWizardStep = 1;
    const TOTAL_WIZARD_STEPS = 4;

    const formatCLP = (num) => '$' + Math.round(num || 0).toLocaleString('es-CL');

    const refreshIcons = () => {
        if (window.lucide) {
            lucide.createIcons();
        }
    };

    // --- Notificaciones ---
    const showNotification = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        toast.innerHTML = `<span>${icon}</span> ${message}`;
        notificationContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    };

    // --- Modal de Confirmación Custom ---
    const customConfirm = (message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const msgEl = document.getElementById('confirm-message');
            const btnAccept = document.getElementById('confirm-accept');
            const btnCancel = document.getElementById('confirm-cancel');

            msgEl.innerText = message;
            modal.classList.add('active');

            const cleanup = (value) => {
                modal.classList.remove('active');
                btnAccept.removeEventListener('click', onAccept);
                btnCancel.removeEventListener('click', onCancel);
                resolve(value);
            };

            const onAccept = () => cleanup(true);
            const onCancel = () => cleanup(false);

            btnAccept.addEventListener('click', onAccept);
            btnCancel.addEventListener('click', onCancel);
        });
    };

    // --- Lógica de Autocompletado Custom ---
    const loadAllModelos = async () => {
        allModelos = await window.api.getModelos();
    };

    const closeAllLists = (elmnt) => {
        const x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inputEquipo) {
                x[i].innerHTML = "";
            }
        }
    };

    inputEquipo.addEventListener("input", function(e) {
        const val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;
        
        const filtered = allModelos.filter(m => m.toLowerCase().includes(val.toLowerCase()));
        
        // Ordenar para que los que empiezan con el texto aparezcan primero
        filtered.sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(val.toLowerCase());
            const bStarts = b.toLowerCase().startsWith(val.toLowerCase());
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        });

        filtered.forEach(m => {
            const b = document.createElement("DIV");
            // Escapar caracteres especiales para el regex de resaltado
            const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedVal})`, "gi");
            b.innerHTML = m.replace(regex, "<strong>$1</strong>");
            b.innerHTML += `<input type='hidden' value='${m}'>`;
            
            b.addEventListener("click", function(e) {
                inputEquipo.value = this.getElementsByTagName("input")[0].value;
                closeAllLists();
                buscarFicha(inputEquipo.value);
            });
            autocompleteList.appendChild(b);
        });
    });

    inputEquipo.addEventListener("keydown", function(e) {
        let x = document.getElementById("autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) {
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });

    // --- Lógica de Ficha Técnica ---
    const buscarFicha = async (modelo) => {
        if (!modelo) return;
        
        try {
            // Cargar del historial local
            const fichaLocal = await window.api.getFicha(modelo);
            if (fichaLocal) {
                textareaFicha.value = fichaLocal;
            }
        } catch (error) {
            console.error('Error al cargar ficha:', error);
        }
    };

    // Disparar búsqueda al perder el foco
    inputEquipo.addEventListener('blur', () => {
        setTimeout(() => {
            if (autocompleteList.innerHTML === "") {
                buscarFicha(inputEquipo.value.trim());
            }
        }, 200);
    });

    // --- Validación Custom ---
    const validateForm = (form) => {
        let isValid = true;
        const inputs = form.querySelectorAll('[required]');
        inputs.forEach(input => {
            const group = input.closest('.form-group');
            if (!input.value.trim()) {
                group.classList.add('has-error');
                isValid = false;
            } else {
                group.classList.remove('has-error');
            }
        });
        return isValid;
    };

    document.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', () => {
            const group = el.closest('.form-group');
            if (group) group.classList.remove('has-error');
        });
    });

    // --- Navegación ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-view');
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            if (target === 'view-historial') loadServicios();
            if (target === 'view-pendientes') loadPendientes();
            if (target === 'view-precios') loadPrecios();
            if (target === 'view-registro') loadAllModelos();
            if (target === 'view-configuracion') loadShopConfig();
        });
    });

    // --- Configuración de la Tienda ---
    const loadShopConfig = async () => {
        const phone = await window.api.getSetting('shop_phone');
        if (phone) {
            document.getElementById('shop-phone').value = phone;
        }
    };

    document.getElementById('btn-save-config')?.addEventListener('click', async () => {
        const phone = document.getElementById('shop-phone').value.trim();
        await window.api.saveSetting('shop_phone', phone);
        showNotification('Configuración guardada', 'success');
    });

    // --- Lógica de Servicios ---
    const loadServicios = async () => {
        try {
            allServicios = await window.api.getServicios();
            applyFilters();
            applyPendientesFilters();
        } catch (error) {
            showNotification('Error al cargar servicios', 'error');
        }
    };

    const renderHistoryCards = (data) => {
        serviciosGrid.innerHTML = '';
        
        // Agrupar por grupo_id (o por id si no tiene grupo_id)
        const groups = {};
        data.forEach(s => {
            const gid = s.grupo_id || `single-${s.id}`;
            if (!groups[gid]) {
                groups[gid] = {
                    id: s.id,
                    grupo_id: s.grupo_id,
                    cliente: s.cliente,
                    fecha: s.fecha,
                    estado: s.estado,
                    items: []
                };
            }
            groups[gid].items.push(s);
        });

        Object.values(groups).forEach(g => {
            const card = document.createElement('div');
            card.className = 'service-card';
            const fecha = new Date(g.fecha).toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            const totalMonto = g.items.reduce((sum, item) => sum + (item.monto || 0), 0);
            const equipoTexto = g.items.length > 1 ? `${g.items.length} Equipos` : g.items[0].equipo;
            
            // Buscar si algún item tiene fecha programada o teléfono
            const firstItem = g.items[0];
            const fechaProg = g.items.find(i => i.fecha_programada)?.fecha_programada;
            const telefonoCliente = firstItem.telefono;
            
            let fechaProgHtml = '';
            if (fechaProg) {
                const fP = new Date(fechaProg).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                fechaProgHtml = `<span class="card-scheduled"><i data-lucide="calendar"></i> ${fP}</span>`;
            }

            let contactBtnHtml = '';
            if (telefonoCliente) {
                const cleanPhone = telefonoCliente.replace(/\D/g, '');
                const fullPhone = cleanPhone.startsWith('56') ? cleanPhone : '56' + cleanPhone;
                contactBtnHtml = `
                    <button class="btn-whatsapp" onclick="event.stopPropagation(); window.contactarCliente('${fullPhone}', '${g.cliente}', '${equipoTexto}')">
                        <i data-lucide="message-circle"></i> <span>WhatsApp</span>
                    </button>
                `;
            }
            
            let itemsHtml = '';
            g.items.forEach((item, index) => {
                itemsHtml += `
                    <div class="group-item ${index > 0 ? 'mt-1 pt-1 border-top' : ''}">
                        <div class="item-header">
                            <span class="item-type-badge">${item.tipo_equipo || 'Notebook'}</span>
                            <strong>${item.equipo}</strong>
                        </div>
                        <div class="detail-section">
                            <span class="detail-label">Falla / Descripción</span>
                            <div class="detail-content">${item.descripcion_falla || 'Sin descripción'}</div>
                        </div>
                        ${item.solucion ? `
                        <div class="detail-section">
                            <span class="detail-label">Solución</span>
                            <div class="detail-content">${item.solucion}</div>
                        </div>` : ''}
                        ${item.specs ? `
                        <div class="detail-section">
                            <span class="detail-label">Ficha Técnica</span>
                            <div class="detail-content">${item.specs}</div>
                        </div>` : ''}
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="card-summary">
                    <div class="card-main-info">
                        <span class="card-client">${g.cliente}</span>
                        <span class="card-equipment">${equipoTexto}</span>
                    </div>
                    <div class="card-meta">
                        <span class="card-date">${fecha}</span>
                        ${fechaProgHtml}
                        <span class="card-price">${formatCLP(totalMonto)}</span>
                        <span class="status-tag status-${g.estado.toLowerCase()} clickable"
                              onclick="event.stopPropagation(); window.toggleStatus(${g.id}, '${g.estado}', ${g.grupo_id ? `'${g.grupo_id}'` : 'null'})">
                            ${g.estado}
                        </span>
                    </div>
                </div>
                <div class="card-details">
                    <div class="items-container">
                        ${itemsHtml}
                    </div>
                    <div class="card-actions">
                        ${contactBtnHtml}
                        <button class="btn-edit" onclick="event.stopPropagation(); window.abrirEditarServicio(${g.id})"><i data-lucide="edit"></i> Editar</button>
                        <button class="btn-edit" style="background: #000; color: #fff;" onclick="event.stopPropagation(); window.generarBoleta(${g.id}, ${g.grupo_id ? `'${g.grupo_id}'` : 'null'})"><i data-lucide="file-text"></i> Boleta</button>
                        <button class="btn-danger" onclick="event.stopPropagation(); window.eliminarServicio(${g.id}, ${g.grupo_id ? `'${g.grupo_id}'` : 'null'})"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                card.classList.toggle('expanded');
            });

            serviciosGrid.appendChild(card);
        });
        refreshIcons();
    };


    const applyFilters = () => {
        // Historial: todos los equipos sin excepción
        let filtered = [...allServicios];
        const term = searchInput.value.toLowerCase();
        if (term) {
            filtered = filtered.filter(s =>
                s.cliente.toLowerCase().includes(term) ||
                s.equipo.toLowerCase().includes(term) ||
                (s.descripcion_falla && s.descripcion_falla.toLowerCase().includes(term))
            );
        }
        const from = filterDateFrom.value;
        const to = filterDateTo.value;
        if (from) {
            const fromDate = new Date(from);
            fromDate.setHours(0,0,0,0);
            filtered = filtered.filter(s => new Date(s.fecha) >= fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23,59,59,999);
            filtered = filtered.filter(s => new Date(s.fecha) <= toDate);
        }
        renderHistoryCards(filtered);
    };

    const loadPendientes = async () => {
        try {
            if (allServicios.length === 0) {
                allServicios = await window.api.getServicios();
            }
            applyPendientesFilters();
        } catch (error) {
            showNotification('Error al cargar pendientes', 'error');
        }
    };

    const applyPendientesFilters = () => {
        // En el Tablero mostramos todo lo que no ha salido, o lo que salió recientemente
        const term = searchPendientes.value.toLowerCase();
        let filtered = allServicios;

        if (term) {
            filtered = filtered.filter(s =>
                s.cliente.toLowerCase().includes(term) ||
                s.equipo.toLowerCase().includes(term) ||
                (s.descripcion_falla && s.descripcion_falla.toLowerCase().includes(term))
            );
        }
        renderKanbanBoard(filtered);
    };

    const renderKanbanBoard = (data) => {
        const colPendientes = document.getElementById('items-pendientes');
        const colCompletados = document.getElementById('items-completados');
        const colEntregados = document.getElementById('items-entregados');

        colPendientes.innerHTML = '';
        colCompletados.innerHTML = '';
        colEntregados.innerHTML = '';

        let countP = 0, countC = 0, countE = 0;

        // Agrupar por grupo_id para el tablero también
        const groups = {};
        data.forEach(s => {
            const gid = s.grupo_id || `single-${s.id}`;
            if (!groups[gid]) {
                groups[gid] = {
                    id: s.id,
                    grupo_id: s.grupo_id,
                    cliente: s.cliente,
                    fecha: s.fecha,
                    estado: s.estado,
                    items: []
                };
            }
            groups[gid].items.push(s);
        });

        Object.values(groups).forEach(g => {
            const card = createKanbanCard(g);
            
            if (g.estado === 'Pendiente' || g.estado === 'Programado') {
                colPendientes.appendChild(card);
                countP++;
            } else if (g.estado === 'Completado') {
                colCompletados.appendChild(card);
                countC++;
            } else if (g.estado === 'Entregado') {
                // Solo mostrar los entregados hoy en el tablero (Salida Reciente)
                const today = new Date().toLocaleDateString();
                const itemDate = new Date(g.fecha).toLocaleDateString();
                if (today === itemDate) {
                    colEntregados.appendChild(card);
                    countE++;
                }
            }
        });

        document.getElementById('count-pendientes').innerText = countP;
        document.getElementById('count-completados').innerText = countC;
        document.getElementById('count-entregados').innerText = countE;
        refreshIcons();
    };

    const createKanbanCard = (g) => {
        const card = document.createElement('div');
        card.className = 'service-card';
        const fecha = new Date(g.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

        const totalMonto = g.items.reduce((sum, item) => sum + (item.monto || 0), 0);
        const equipoTexto = g.items.length > 1 ? `${g.items.length} Equipos` : g.items[0].equipo;

        const firstItem = g.items[0];
        const telefonoCliente = firstItem.telefono;

        let contactBtnHtml = '';
        if (telefonoCliente) {
            const cleanPhone = telefonoCliente.replace(/\D/g, '');
            const fullPhone = cleanPhone.startsWith('56') ? cleanPhone : '56' + cleanPhone;
            contactBtnHtml = `
                <button class="btn-whatsapp" onclick="event.stopPropagation(); window.contactarCliente('${fullPhone}', '${g.cliente}', '${equipoTexto}')">
                    <i data-lucide="message-circle"></i>
                </button>
            `;
        }

        let itemsHtml = '';
        g.items.forEach((item, index) => {
            itemsHtml += `
                <div class="group-item ${index > 0 ? 'mt-1 pt-1 border-top' : ''}">
                    <div class="item-header">
                        <strong>${item.equipo}</strong>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="card-summary">
                <div class="card-main-info">
                    <span class="card-client">${g.cliente}</span>
                    <span class="card-equipment">${equipoTexto}</span>
                </div>
                <div class="card-meta">
                    <span class="card-date">${fecha}</span>
                    <span class="card-price">${formatCLP(totalMonto)}</span>
                    <span class="status-tag status-${g.estado.toLowerCase()} clickable"
                          onclick="event.stopPropagation(); window.toggleStatus(${g.id}, '${g.estado}', ${g.grupo_id ? `'${g.grupo_id}'` : 'null'})">
                        ${g.estado}
                    </span>
                </div>
            </div>
            <div class="card-details">
                <div class="items-container">${itemsHtml}</div>
                <div class="card-actions">
                    ${contactBtnHtml}
                    <button class="btn-edit" onclick="event.stopPropagation(); window.abrirEditarServicio(${g.id})"><i data-lucide="edit"></i></button>
                    <button class="btn-edit" style="background: #000; color: #fff; padding: 0.5rem 0.8rem;" onclick="event.stopPropagation(); window.generarBoleta(${g.id}, ${g.grupo_id ? `'${g.grupo_id}'` : 'null'})"><i data-lucide="file-text"></i></button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            card.classList.toggle('expanded');
        });

        return card;
    };

    window.abrirEditarServicio = (id) => {
        const s = allServicios.find(item => item.id === id);
        if (!s) return;

        editingServicioId = id;
        editingGrupoId = s.grupo_id;
        document.getElementById('edit-cliente').value = s.cliente;
        document.getElementById('edit-equipo').value = s.equipo;
        document.getElementById('edit-monto').value = s.monto;
        document.getElementById('edit-estado').value = s.estado;
        document.getElementById('edit-tipo').value = s.tipo_equipo || 'Notebook';
        document.getElementById('edit-fecha-programada').value = s.fecha_programada || '';
        document.getElementById('edit-falla').value = s.descripcion_falla || '';
        document.getElementById('edit-solucion').value = s.solucion || '';
        document.getElementById('edit-specs').value = s.specs || '';
        document.getElementById('edit-telefono').value = s.telefono || '';

        document.getElementById('edit-servicio-modal').classList.add('active');
    };

    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        document.getElementById('edit-servicio-modal').classList.remove('active');
        editingServicioId = null;
    });

    document.getElementById('btn-close-edit').addEventListener('click', () => {
        document.getElementById('edit-servicio-modal').classList.remove('active');
        editingServicioId = null;
    });

    document.getElementById('btn-save-edit').addEventListener('click', async () => {
        if (!editingServicioId) return;

        const updatedServicio = {
            cliente: document.getElementById('edit-cliente').value,
            equipo: document.getElementById('edit-equipo').value,
            monto: parseFloat(document.getElementById('edit-monto').value) || 0,
            estado: document.getElementById('edit-estado').value,
            tipo_equipo: document.getElementById('edit-tipo').value,
            fecha_programada: document.getElementById('edit-fecha-programada').value || null,
            descripcion_falla: document.getElementById('edit-falla').value,
            solucion: document.getElementById('edit-solucion').value,
            specs: document.getElementById('edit-specs').value,
            telefono: document.getElementById('edit-telefono').value,
            grupo_id: editingGrupoId
        };

        try {
            await window.api.updateServicio(editingServicioId, updatedServicio);
            document.getElementById('edit-servicio-modal').classList.remove('active');
            showNotification('Registro actualizado correctamente', 'success');
            loadServicios();
            loadAllModelos(); // Actualizar sugerencias si cambió el modelo
            editingServicioId = null;
        } catch (error) {
            showNotification('Error al actualizar registro', 'error');
        }
    });

    window.toggleStatus = async (id, currentStatus, grupo_id = null) => {
        let nextStatus = 'Pendiente';
        if (currentStatus === 'Pendiente') nextStatus = 'Completado';
        else if (currentStatus === 'Completado') nextStatus = 'Entregado';
        else if (currentStatus === 'Entregado') nextStatus = 'Programado';
        else if (currentStatus === 'Programado') nextStatus = 'Pendiente';

        try {
            if (grupo_id) {
                await window.api.updateStatusGrupo(grupo_id, nextStatus);
            } else {
                await window.api.updateStatus(id, nextStatus);
            }
            showNotification(`Estado: ${nextStatus}`, 'success');
            loadServicios();
        } catch (error) {
            showNotification('Error al cambiar estado', 'error');
        }
    };

    window.eliminarServicio = async (id, grupo_id = null) => {
        const message = grupo_id ? '¿Borrar este grupo de equipos?' : '¿Estás seguro de que deseas borrar este registro?';
        const confirmed = await customConfirm(message);
        if (confirmed) {
            try {
                if (grupo_id) {
                    await window.api.deleteGrupo(grupo_id);
                } else {
                    await window.api.deleteServicio(id);
                }
                showNotification('Registro eliminado', 'success');
                loadServicios();
            } catch (error) {
                showNotification('Error al eliminar registro', 'error');
            }
        }
    };

    // --- Lógica de Múltiples Servicios ---
    const updateSelectedServicesUI = () => {
        selectedServicesList.innerHTML = '';
        let total = 0;
        if (currentSelectedServices.length === 0) {
            selectedServicesContainer.style.display = 'none';
            document.getElementById('monto').value = '';
            return;
        }
        selectedServicesContainer.style.display = 'block';
        currentSelectedServices.forEach((item, index) => {
            total += item.monto;
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.concepto} - <b>${formatCLP(item.monto)}</b></span>
                <span class="remove-item" onclick="window.quitarServicio(${index})">✕</span>
            `;
            selectedServicesList.appendChild(li);
        });
        totalDisplay.innerText = formatCLP(total);
        document.getElementById('monto').value = total.toFixed(2);
        const montoGroup = document.getElementById('monto').closest('.form-group');
        if (montoGroup) montoGroup.classList.remove('has-error');
    };

    window.quitarServicio = (index) => {
        currentSelectedServices.splice(index, 1);
        updateSelectedServicesUI();
    };

    // --- Wizard de Registro ---
    const wizardNextBtn = document.getElementById('wizard-next');
    const wizardPrevBtn = document.getElementById('wizard-prev');
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const stepLines = document.querySelectorAll('.step-line');
    const wizardCompletion = document.getElementById('wizard-completion');
    const saveActions = document.getElementById('save-actions');
    const btnAddAnother = document.getElementById('btn-add-another');

    const updateWizardUI = () => {
        // Mostrar/ocultar pasos
        wizardSteps.forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.step) === currentWizardStep);
        });

        // Actualizar indicadores
        stepIndicators.forEach(ind => {
            const step = parseInt(ind.dataset.step);
            ind.classList.remove('active', 'completed');
            if (step === currentWizardStep) ind.classList.add('active');
            else if (step < currentWizardStep) ind.classList.add('completed');
        });

        // Actualizar lineas
        stepLines.forEach((line, idx) => {
            line.classList.toggle('completed', idx < currentWizardStep - 1);
        });

        // Boton anterior
        wizardPrevBtn.style.visibility = currentWizardStep === 1 ? 'hidden' : 'visible';

        // Texto boton siguiente
        if (currentWizardStep === TOTAL_WIZARD_STEPS) {
            wizardNextBtn.textContent = 'Agregar a la lista';
        } else {
            wizardNextBtn.textContent = 'Siguiente';
        }
    };

    const validateWizardStep = (step) => {
        let isValid = true;
        const currentStepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
        if (!currentStepEl) return true;

        const requiredInputs = currentStepEl.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            const group = input.closest('.form-group');
            // Si el campo está oculto (como el nombre de equipo en PC), ignorar validación
            if (group && group.style.display === 'none') {
                group.classList.remove('has-error');
                return;
            }

            if (!input.value.trim()) {
                group.classList.add('has-error');
                isValid = false;
            } else {
                group.classList.remove('has-error');
            }
        });
        return isValid;
    };

    const addEquipmentFromWizard = () => {
        const tipo = document.getElementById('tipo-equipo').value;
        const equipo = (tipo === 'PC') ? 'PC de Escritorio' : inputEquipo.value.trim();
        const falla = document.getElementById('falla').value.trim();
        const specs = textareaFicha.value.trim();
        const monto = parseFloat(document.getElementById('monto').value) || 0;

        if (tipo !== 'PC' && !equipo) {
            showNotification('Indica el equipo antes de agregarlo', 'error');
            inputEquipo.closest('.form-group').classList.add('has-error');
            return false;
        }

        const conceptosStr = currentSelectedServices.map(s => s.concepto).join(', ');
        const descripcionFinal = conceptosStr + (falla ? (conceptosStr ? ' | ' : '') + 'Notas: ' + falla : '');

        currentSelectedEquipment.push({
            equipo,
            descripcion_falla: descripcionFinal,
            specs,
            monto,
            solucion: document.getElementById('solucion').value,
            tipo_equipo: tipo
        });

        // Mostrar resumen y opciones
        document.querySelector('.wizard-progress').style.display = 'none';
        document.querySelector('.wizard-steps').style.display = 'none';
        document.querySelector('.wizard-nav').style.display = 'none';
        wizardCompletion.style.display = 'block';
        saveActions.style.display = 'flex';

        updateSelectedEquipmentUI();
        showNotification('Equipo añadido a la lista', 'info');
        return true;
    };

    const resetWizard = () => {
        // Limpiar campos del equipo, servicios y detalles
        inputEquipo.value = '';
        document.getElementById('falla').value = '';
        textareaFicha.value = '';
        document.getElementById('monto').value = '';
        document.getElementById('solucion').value = '';
        document.getElementById('tipo-equipo').value = 'Notebook';
        document.getElementById('equipo-wrapper').style.display = 'block';
        currentSelectedServices = [];
        updateSelectedServicesUI();

        // Reset paso
        currentWizardStep = 1;

        // Mostrar wizard de nuevo
        document.querySelector('.wizard-progress').style.display = 'flex';
        document.querySelector('.wizard-steps').style.display = 'block';
        document.querySelector('.wizard-nav').style.display = 'flex';
        wizardCompletion.style.display = 'none';

        updateWizardUI();
    };

    wizardNextBtn.addEventListener('click', () => {
        if (!validateWizardStep(currentWizardStep)) {
            showNotification('Completa los campos obligatorios', 'error');
            return;
        }
        if (currentWizardStep === TOTAL_WIZARD_STEPS) {
            addEquipmentFromWizard();
        } else {
            currentWizardStep++;
            updateWizardUI();
        }
    });

    wizardPrevBtn.addEventListener('click', () => {
        if (currentWizardStep > 1) {
            currentWizardStep--;
            updateWizardUI();
        }
    });

    if (btnAddAnother) {
        btnAddAnother.addEventListener('click', resetWizard);
    }

    // --- Lógica de Múltiples Equipos ---
    const updateSelectedEquipmentUI = () => {
        selectedEquipmentList.innerHTML = '';
        const countEl = document.getElementById('equipment-count');
        if (currentSelectedEquipment.length === 0) {
            selectedEquipmentContainer.style.display = 'none';
            if (countEl) countEl.textContent = '0';
            return;
        }
        selectedEquipmentContainer.style.display = 'block';
        if (countEl) countEl.textContent = currentSelectedEquipment.length.toString();
        currentSelectedEquipment.forEach((item, index) => {
            const li = document.createElement('li');
            const tipoLabel = item.tipo_equipo === 'PC' ? 'PC Escritorio' : item.tipo_equipo || 'Notebook';
            li.innerHTML = `
                <span><span class="item-type-badge">${tipoLabel}</span> <b>${item.equipo}</b></span>
                <span class="remove-item" onclick="window.quitarEquipo(${index})" title="Quitar">&#10005;</span>
            `;
            selectedEquipmentList.appendChild(li);
        });
    };

    window.quitarEquipo = (index) => {
        currentSelectedEquipment.splice(index, 1);
        updateSelectedEquipmentUI();
    };

    document.getElementById('tipo-equipo').addEventListener('change', (e) => {
        const wrapper = document.getElementById('equipo-wrapper');
        if (e.target.value === 'PC') {
            wrapper.style.display = 'none';
        } else {
            wrapper.style.display = 'block';
        }
    });

    // --- Lógica de Precios ---
    const loadPrecios = async () => {
        try {
            allPrecios = await window.api.getPrecios();
            renderPriceCards(allPrecios);
            renderQuickPrices(allPrecios);
        } catch (error) {
            showNotification('Error al cargar precios', 'error');
        }
    };

    const renderPriceCards = (data) => {
        preciosGrid.innerHTML = '';
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'price-item-card';
            if (p.es_paquete) card.classList.add('is-package');
            
            card.innerHTML = `
                <div class="price-item-info">
                    <span class="price-item-name">${p.es_paquete ? '<i data-lucide="package" class="inline-icon"></i> ' : ''}${p.concepto}</span>
                    <span class="price-item-amount">${formatCLP(p.monto)}</span>
                </div>
                <div class="price-item-actions">
                    <button class="price-item-edit" onclick="window.editarPrecio(${p.id}, '${p.concepto}', ${p.monto}, ${p.es_paquete || 0})" title="Editar"><i data-lucide="edit-3"></i></button>
                    <button class="price-item-delete" onclick="window.eliminarPrecio(${p.id})" title="Eliminar"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            preciosGrid.appendChild(card);
        });
        refreshIcons();
    };

    const renderQuickPrices = (data) => {
        quickPricesList.innerHTML = '';
        data.forEach(p => {
            const chip = document.createElement('div');
            chip.className = `price-chip ${p.es_paquete ? 'is-package' : ''}`;
            chip.innerHTML = `${p.es_paquete ? '<i data-lucide="package" class="inline-icon"></i> ' : ''}${p.concepto} <b>${formatCLP(p.monto)}</b>`;
            chip.addEventListener('click', () => {
                currentSelectedServices.push({ concepto: p.concepto, monto: p.monto });
                updateSelectedServicesUI();
                showNotification(`Agregado: ${p.concepto}`, 'info');
            });
            quickPricesList.appendChild(chip);
        });
        refreshIcons();
    };

    window.eliminarPrecio = async (id) => {
        const confirmed = await customConfirm('¿Eliminar este precio predefinido?');
        if (confirmed) {
            await window.api.deletePrecio(id);
            loadPrecios();
            showNotification('Precio eliminado', 'success');
        }
    };

    // --- Event Listeners Filtros ---
    searchInput.addEventListener('input', applyFilters);
    filterDateFrom.addEventListener('change', applyFilters);
    filterDateTo.addEventListener('change', applyFilters);
    searchPendientes.addEventListener('input', applyPendientesFilters);

    // --- Envío de Formularios ---
    formServicio.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Si no hay equipos en la lista, intentar agregar el actual
        if (currentSelectedEquipment.length === 0) {
            const added = addEquipmentFromWizard();
            if (!added) {
                showNotification('Agrega al menos un equipo', 'error');
                // Restaurar wizard si se oculto
                document.querySelector('.wizard-progress').style.display = 'flex';
                document.querySelector('.wizard-steps').style.display = 'block';
                document.querySelector('.wizard-nav').style.display = 'flex';
                wizardCompletion.style.display = 'none';
                saveActions.style.display = 'none';
                currentWizardStep = TOTAL_WIZARD_STEPS;
                updateWizardUI();
                return;
            }
        }

        const cliente = document.getElementById('cliente').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const fecha_programada = document.getElementById('fecha-programada').value || null;

        if (!cliente) {
            showNotification('Indica el nombre del cliente', 'error');
            document.getElementById('cliente').closest('.form-group').classList.add('has-error');
            return;
        }

        try {
            const grupo_id = Date.now().toString(); 
            const now = new Date().toISOString(); // Usar la misma fecha exacta para todo el grupo
            for (const item of currentSelectedEquipment) {
                const servicio = {
                    cliente: cliente,
                    equipo: item.equipo,
                    monto: item.monto,
                    estado: fecha_programada ? 'Programado' : 'Pendiente',
                    descripcion_falla: item.descripcion_falla,
                    solucion: item.solucion,
                    specs: item.specs || null,
                    grupo_id: grupo_id,
                    tipo_equipo: item.tipo_equipo,
                    fecha_programada: fecha_programada,
                    fecha: now,
                    telefono: telefono
                };
                await window.api.saveServicio(servicio);
            }

            formServicio.reset();
            document.getElementById('telefono').value = ''; // Reset manual por el wrapper
            currentSelectedServices = [];
            currentSelectedEquipment = [];
            updateSelectedServicesUI();
            updateSelectedEquipmentUI();
            document.getElementById('fecha-programada').value = '';

            // Reset wizard completo despues de guardar
            document.querySelector('.wizard-progress').style.display = 'flex';
            document.querySelector('.wizard-steps').style.display = 'block';
            document.querySelector('.wizard-nav').style.display = 'flex';
            wizardCompletion.style.display = 'none';
            saveActions.style.display = 'none';
            currentWizardStep = 1;
            updateWizardUI();

            loadAllModelos();
            showNotification('Registro guardado correctamente', 'success');
            loadServicios();
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar registro', 'error');
        }
    });

    formPrecio.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm(formPrecio)) return;
        const concepto = document.getElementById('p-concepto').value;
        const monto = parseFloat(document.getElementById('p-monto').value);
        const es_paquete = document.getElementById('p-es-paquete').checked ? 1 : 0;

        try {
            await window.api.savePrecio({ concepto, monto, es_paquete });
            showNotification('Precio agregado', 'success');
            formPrecio.reset();
            loadPrecios();
        } catch (error) {
            showNotification('Error al agregar precio', 'error');
        }
    });

    // --- Modal de Edicion de Precio ---
    const editPrecioModal = document.getElementById('edit-precio-modal');

    const closeEditPrecioModal = () => {
        editPrecioModal.classList.remove('active');
        editingPrecioId = null;
    };

    window.editarPrecio = (id, concepto, monto, es_paquete) => {
        editingPrecioId = id;
        document.getElementById('edit-p-concepto').value = concepto;
        document.getElementById('edit-p-monto').value = monto;
        document.getElementById('edit-p-es-paquete').checked = es_paquete === 1;
        editPrecioModal.classList.add('active');
    };

    document.getElementById('btn-cancel-edit-precio').addEventListener('click', closeEditPrecioModal);
    document.getElementById('btn-close-edit-precio').addEventListener('click', closeEditPrecioModal);

    document.getElementById('btn-save-edit-precio').addEventListener('click', async () => {
        if (!editingPrecioId) return;

        const concepto = document.getElementById('edit-p-concepto').value.trim();
        const monto = parseFloat(document.getElementById('edit-p-monto').value);
        const es_paquete = document.getElementById('edit-p-es-paquete').checked ? 1 : 0;

        if (!concepto || isNaN(monto)) {
            showNotification('Completa todos los campos', 'error');
            return;
        }

        try {
            await window.api.updatePrecio(editingPrecioId, concepto, monto, es_paquete);
            closeEditPrecioModal();
            showNotification('Precio actualizado', 'success');
            loadPrecios();
        } catch (error) {
            showNotification('Error al actualizar precio', 'error');
        }
    });


    // --- Lógica de Boleta / Recibo ---
    const boletaModal = document.getElementById('boleta-modal');
    
    window.generarBoleta = (id, grupo_id = null) => {
        let items = [];
        if (grupo_id) {
            items = allServicios.filter(s => s.grupo_id === grupo_id);
        } else {
            const s = allServicios.find(item => item.id === id);
            if (s) items = [s];
        }

        if (items.length === 0) return;

        const first = items[0];
        const shopPhone = document.getElementById('shop-phone').value || '';
        
        document.getElementById('ticket-shop-phone-display').innerText = shopPhone ? `WhatsApp: +56 ${shopPhone}` : '';
        document.getElementById('t-fecha').innerText = new Date(first.fecha).toLocaleDateString('es-ES');
        document.getElementById('t-id').innerText = first.grupo_id || first.id;
        document.getElementById('t-cliente').innerText = first.cliente;
        document.getElementById('t-telefono').innerText = first.telefono ? `Tel: +56 ${first.telefono}` : '';

        const itemsList = document.getElementById('t-items-list');
        itemsList.innerHTML = '';
        let total = 0;

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ticket-item';
            div.innerHTML = `
                <div class="ticket-item-header">
                    <span>${item.equipo}</span>
                    <span>${formatCLP(item.monto)}</span>
                </div>
                <div class="ticket-item-desc">${item.descripcion_falla || ''}</div>
            `;
            itemsList.appendChild(div);
            total += (item.monto || 0);
        });

        document.getElementById('t-total').innerText = formatCLP(total);
        boletaModal.classList.add('active');
    };

    document.getElementById('btn-close-boleta').addEventListener('click', () => {
        boletaModal.classList.remove('active');
    });

    document.getElementById('btn-print-boleta').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('btn-copy-wa').addEventListener('click', () => {
        const cliente = document.getElementById('t-cliente').innerText;
        const total = document.getElementById('t-total').innerText;
        const items = Array.from(document.querySelectorAll('.ticket-item')).map(el => {
            const header = el.querySelector('.ticket-item-header').innerText;
            return `- ${header}`;
        }).join('\n');

        const text = `*COMPROBANTE DE SERVICIO*\n\nHola ${cliente},\nAdjuntamos el detalle de tu servicio:\n\n${items}\n\n*TOTAL: ${total}*\n\nGracias por tu preferencia.`;
        
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Texto copiado correctamente', 'success');
        });
    });

    document.getElementById('btn-copy-img').addEventListener('click', async () => {
        const ticket = document.getElementById('boleta-content');
        try {
            showNotification('Generando imagen...', 'info');
            
            // Usamos html2canvas para capturar el div del ticket
            const canvas = await html2canvas(ticket, {
                backgroundColor: '#ffffff',
                scale: 2, // Mayor calidad
                logging: false,
                useCORS: true
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showNotification('Error al generar la imagen', 'error');
                    return;
                }

                try {
                    // Copiar el Blob de imagen al portapapeles
                    const data = [new ClipboardItem({ [blob.type]: blob })];
                    await navigator.clipboard.write(data);
                    showNotification('¡Imagen copiada! Ya puedes pegarla en WhatsApp (Ctrl+V)', 'success');
                } catch (err) {
                    console.error('Error al copiar al portapapeles:', err);
                    showNotification('Error al copiar imagen. Intenta con el texto.', 'error');
                }
            }, 'image/png');

        } catch (error) {
            console.error('Error html2canvas:', error);
            showNotification('Error al procesar la imagen', 'error');
        }
    });

    // Carga inicial secuencial para mostrar estados
    const initApp = async () => {
        try {
            updateLoading('Conectando con la base de datos...', 10);
            // Simular un pequeño delay inicial para que se vea la pantalla
            await new Promise(resolve => setTimeout(resolve, 400));

            updateLoading('Cargando servicios y reparaciones...', 30);
            await loadServicios();
            
            updateLoading('Cargando lista de precios...', 60);
            await loadPrecios();
            
            updateLoading('Sincronizando modelos y equipos...', 85);
            await loadAllModelos();
            
            updateLoading('Cargando configuración...', 90);
            await loadShopConfig();
            
            updateLoading('Preparando interfaz...', 95);
            updateWizardUI();
            
            updateLoading('¡Sistema listo!', 100);
            
            // Delay final para suavidad
            setTimeout(() => {
                if (loadingScreen) loadingScreen.classList.add('fade-out');
            }, 800);
        } catch (error) {
            console.error('Error durante la carga:', error);
            if (loadingStatus) loadingStatus.innerText = 'Error al iniciar sistema';
            setTimeout(() => {
                if (loadingScreen) loadingScreen.classList.add('fade-out');
            }, 1500);
        }
    };

    initApp();
});
