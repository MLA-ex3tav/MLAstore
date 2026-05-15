const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { initDb, saveServicio, getServicios, deleteServicio, deleteGrupo, updateServicio, getModelosUnicos, getFichaPorModelo, getPrecios, savePrecio, updatePrecio, deletePrecio, updateStatus, updateStatusGrupo, saveSetting, getSetting } = require('./database');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: "Gestión de Servicio Técnico",
        autoHideMenuBar: true
    });

    Menu.setApplicationMenu(null);

    if (isDev) {
        win.webContents.openDevTools();
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
    }
}

app.whenReady().then(() => {
    try {
        initDb();
    } catch (e) {
        console.error("Database initialization failed:", e);
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-servicios', async () => {
    return getServicios();
});

ipcMain.handle('save-servicio', async (event, servicio) => {
    return saveServicio(servicio);
});

ipcMain.handle('delete-servicio', async (event, id) => {
    return deleteServicio(id);
});

ipcMain.handle('delete-grupo', async (event, grupo_id) => {
    return deleteGrupo(grupo_id);
});

ipcMain.handle('update-servicio', async (event, { id, servicio }) => {
    return updateServicio(id, servicio);
});

ipcMain.handle('get-precios', async () => {
    return getPrecios();
});

ipcMain.handle('save-precio', async (event, precio) => {
    return savePrecio(precio);
});

ipcMain.handle('update-precio', async (event, { id, concepto, monto, es_paquete }) => {
    return updatePrecio(id, concepto, monto, es_paquete);
});

ipcMain.handle('delete-precio', async (event, id) => {
    return deletePrecio(id);
});

ipcMain.handle('update-status', async (event, { id, status }) => {
    return updateStatus(id, status);
});

ipcMain.handle('update-status-grupo', async (event, { grupo_id, status }) => {
    return updateStatusGrupo(grupo_id, status);
});

ipcMain.handle('save-setting', async (event, { key, value }) => {
    return saveSetting(key, value);
});

ipcMain.handle('get-setting', async (event, key) => {
    return getSetting(key);
});

ipcMain.handle('get-ficha', async (event, modelo) => {
    return getFichaPorModelo(modelo);
});

ipcMain.handle('get-modelos', async (event) => {
    return getModelosUnicos();
});


