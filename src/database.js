const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'servicios.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
    const queryServicios = `
        CREATE TABLE IF NOT EXISTS servicios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            equipo TEXT NOT NULL,
            descripcion_falla TEXT,
            solucion TEXT,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            monto REAL,
            estado TEXT DEFAULT 'Pendiente',
            specs TEXT,
            grupo_id TEXT,
            tipo_equipo TEXT,
            fecha_programada TEXT,
            telefono TEXT
        )
    `;
    const queryPrecios = `
        CREATE TABLE IF NOT EXISTS precios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            concepto TEXT NOT NULL,
            monto REAL NOT NULL,
            es_paquete INTEGER DEFAULT 0
        )
    `;
    const querySettings = `
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `;
    const queryFichas = `
        CREATE TABLE IF NOT EXISTS fichas_tecnicas (
            modelo TEXT PRIMARY KEY,
            detalles TEXT
        )
    `;
    const queryModelos = `
        CREATE TABLE IF NOT EXISTS modelos (
            nombre TEXT PRIMARY KEY
        )
    `;
    db.serialize(() => {
        // Inicializar otras tablas siempre
        db.run(queryPrecios);
        db.run(querySettings);
        db.run(queryFichas);
        db.run(queryModelos);
        
        // Asegurar columna es_paquete
        db.run(`ALTER TABLE precios ADD COLUMN es_paquete INTEGER DEFAULT 0`, (err) => {});

        // Verificar si la tabla servicios tiene el constraint restrictivo
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='servicios'", (err, row) => {
            if (row && row.sql.includes("CHECK") && !row.sql.includes("Programado")) {
                console.log("Migrando tabla servicios para eliminar restricciones de estado...");
                db.serialize(() => {
                    db.run(`ALTER TABLE servicios RENAME TO servicios_old`);
                    db.run(queryServicios);
                    db.run(`INSERT INTO servicios (id, cliente, equipo, descripcion_falla, solucion, fecha, monto, estado, specs) 
                            SELECT id, cliente, equipo, descripcion_falla, solucion, fecha, monto, estado, specs FROM servicios_old`);
                    db.run(`DROP TABLE servicios_old`);
                    // Asegurar que las columnas nuevas existan después de la migración básica
                    db.run(`ALTER TABLE servicios ADD COLUMN grupo_id TEXT`, (err) => {});
                    db.run(`ALTER TABLE servicios ADD COLUMN tipo_equipo TEXT`, (err) => {});
                    db.run(`ALTER TABLE servicios ADD COLUMN fecha_programada TEXT`, (err) => {});
                });
            } else {
                db.run(queryServicios);
                // Asegurar que las columnas existan si la tabla ya existía sin ellas
                db.run(`ALTER TABLE servicios ADD COLUMN specs TEXT`, (err) => {});
                db.run(`ALTER TABLE servicios ADD COLUMN grupo_id TEXT`, (err) => {});
                db.run(`ALTER TABLE servicios ADD COLUMN tipo_equipo TEXT`, (err) => {});
                db.run(`ALTER TABLE servicios ADD COLUMN fecha_programada TEXT`, (err) => {});
                db.run(`ALTER TABLE servicios ADD COLUMN telefono TEXT`, (err) => {});
            }
        });
    });
};

const saveServicio = (servicio) => {
    return new Promise((resolve, reject) => {
        const { cliente, equipo, descripcion_falla, solucion, monto, estado, specs, grupo_id, tipo_equipo, fecha_programada, fecha, telefono } = servicio;
        const query = `
            INSERT INTO servicios (cliente, equipo, descripcion_falla, solucion, monto, estado, specs, grupo_id, tipo_equipo, fecha_programada, fecha, telefono)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
        `;
        db.run(query, [cliente, equipo, descripcion_falla, solucion, monto, estado, specs, grupo_id, tipo_equipo, fecha_programada, fecha, telefono], function(err) {
            if (err) reject(err);
            else {
                // Guardar en la tabla maestra de modelos
                db.run(`INSERT OR IGNORE INTO modelos (nombre) VALUES (?)`, [equipo]);
                
                // Retroalimentación: Guardar la ficha técnica del modelo
                if (specs) {
                    db.run(`INSERT OR REPLACE INTO fichas_tecnicas (modelo, detalles) VALUES (?, ?)`, [equipo, specs]);
                }
                resolve({ id: this.lastID });
            }
        });
    });
};

const getServicios = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM servicios ORDER BY fecha DESC`;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getFichaPorModelo = (modelo) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT detalles FROM fichas_tecnicas WHERE modelo = ?`, [modelo], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.detalles : null);
        });
    });
};

const getModelosUnicos = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT nombre as modelo FROM modelos
            UNION 
            SELECT DISTINCT equipo as modelo FROM servicios 
            UNION 
            SELECT DISTINCT modelo FROM fichas_tecnicas
            ORDER BY modelo ASC
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.modelo));
        });
    });
};

const getPrecios = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM precios ORDER BY concepto ASC`;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const savePrecio = (precio) => {
    return new Promise((resolve, reject) => {
        const { concepto, monto, es_paquete } = precio;
        db.run(`INSERT INTO precios (concepto, monto, es_paquete) VALUES (?, ?, ?)`, [concepto, monto, es_paquete || 0], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
};

const updatePrecio = (id, concepto, monto, es_paquete) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE precios SET concepto = ?, monto = ?, es_paquete = ? WHERE id = ?`, [concepto, monto, es_paquete || 0, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const deletePrecio = (id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM precios WHERE id = ?`, [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const updateServicio = (id, servicio) => {
    return new Promise((resolve, reject) => {
        const { cliente, equipo, descripcion_falla, solucion, monto, specs, estado, grupo_id, tipo_equipo, fecha_programada, telefono } = servicio;
        const query = `
            UPDATE servicios 
            SET cliente = ?, equipo = ?, descripcion_falla = ?, solucion = ?, monto = ?, specs = ?, estado = ?, grupo_id = ?, tipo_equipo = ?, fecha_programada = ?, telefono = ?
            WHERE id = ?
        `;
        db.run(query, [cliente, equipo, descripcion_falla, solucion, monto, specs, estado, grupo_id, tipo_equipo, fecha_programada, telefono, id], (err) => {
            if (err) reject(err);
            else {
                // Guardar en la tabla maestra de modelos
                db.run(`INSERT OR IGNORE INTO modelos (nombre) VALUES (?)`, [equipo]);

                if (specs) {
                    db.run(`INSERT OR REPLACE INTO fichas_tecnicas (modelo, detalles) VALUES (?, ?)`, [equipo, specs]);
                }
                resolve();
            }
        });
    });
};

const deleteServicio = (id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM servicios WHERE id = ?`, [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const deleteGrupo = (grupo_id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM servicios WHERE grupo_id = ?`, [grupo_id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const updateStatus = (id, nuevoEstado) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE servicios SET estado = ? WHERE id = ?`;
        db.run(query, [nuevoEstado, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const updateStatusGrupo = (grupo_id, nuevoEstado) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE servicios SET estado = ? WHERE grupo_id = ?`;
        db.run(query, [nuevoEstado, grupo_id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const saveSetting = (key, value) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const getSetting = (key) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.value : null);
        });
    });
};

module.exports = {
    initDb,
    saveServicio,
    getServicios,
    deleteServicio,
    getModelosUnicos,
    getFichaPorModelo,
    getPrecios,
    savePrecio,
    deletePrecio,
    updateStatus,
    updateStatusGrupo,
    updateServicio,
    updatePrecio,
    saveSetting,
    getSetting,
    deleteGrupo
};
