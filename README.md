# App de Gestión para Servicio Técnico

Esta es una aplicación base construida con **Electron** y **SQLite3** (`better-sqlite3`).

## Estructura del Proyecto

- `src/main.js`: Proceso principal (creación de ventanas y handlers IPC).
- `src/preload.js`: Puente seguro entre el proceso principal y el frontend.
- `src/database.js`: Lógica de base de datos (SQLite).
- `src/renderer/`: Archivos del frontend (HTML, CSS, JS).

## Requisitos de Instalación

Debido a que `better-sqlite3` es un módulo nativo, es posible que necesites herramientas de compilación en Windows si no se descargan los binarios preconstruidos.

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Si recibes errores de compilación (gyp), intenta reconstruir para Electron:
   ```bash
   npm install --save-dev electron-rebuild
   npx electron-rebuild -f -w better-sqlite3
   ```

## Ejecución

Para iniciar la aplicación:
```bash
npm start
```

## Características
- **Base de Datos Local**: Los datos se guardan en `servicios.db` dentro de la carpeta de datos de usuario de la app.
- **Seguridad**: Uso de `contextBridge` para evitar exponer `ipcRenderer` directamente.
- **Diseño**: Estética "Paper and Ink" (minimalista, alto contraste, estilo editorial).
