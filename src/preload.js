const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getServicios: () => ipcRenderer.invoke('get-servicios'),
    saveServicio: (servicio) => ipcRenderer.invoke('save-servicio', servicio),
    getPrecios: () => ipcRenderer.invoke('get-precios'),
    savePrecio: (precio) => ipcRenderer.invoke('save-precio', precio),
    updatePrecio: (id, concepto, monto, es_paquete) => ipcRenderer.invoke('update-precio', { id, concepto, monto, es_paquete }),
    deletePrecio: (id) => ipcRenderer.invoke('delete-precio', id),
    updateStatus: (id, status) => ipcRenderer.invoke('update-status', { id, status }),
    updateStatusGrupo: (grupo_id, status) => ipcRenderer.invoke('update-status-grupo', { grupo_id, status }),
    saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    getFicha: (modelo) => ipcRenderer.invoke('get-ficha', modelo),
    getModelos: () => ipcRenderer.invoke('get-modelos'),
    deleteServicio: (id) => ipcRenderer.invoke('delete-servicio', id),
    deleteGrupo: (grupo_id) => ipcRenderer.invoke('delete-grupo', grupo_id),
    updateServicio: (id, servicio) => ipcRenderer.invoke('update-servicio', { id, servicio })
});
