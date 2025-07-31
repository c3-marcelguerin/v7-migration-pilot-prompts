const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor(dbPath = path.join(__dirname, '../data/types.db')) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const fs = require('fs');
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS analysis_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                root_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                type_count INTEGER NOT NULL,
                edge_count INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                type_name TEXT NOT NULL,
                field_count INTEGER DEFAULT 0,
                complexity_level TEXT,
                migration_order INTEGER,
                error_message TEXT,
                FOREIGN KEY (session_id) REFERENCES analysis_sessions (id),
                UNIQUE(session_id, type_name)
            )`,
            
            `CREATE TABLE IF NOT EXISTS edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                from_type TEXT NOT NULL,
                to_type TEXT NOT NULL,
                field_name TEXT,
                field_type TEXT,
                is_cycle_breaking BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (session_id) REFERENCES analysis_sessions (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS topological_order (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                type_name TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                level INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES analysis_sessions (id),
                UNIQUE(session_id, type_name)
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async clearAllData() {
        const tables = ['topological_order', 'edges', 'types', 'analysis_sessions'];
        for (const table of tables) {
            await this.run(`DELETE FROM ${table}`);
        }
        console.log('All data cleared from database');
    }
}

module.exports = Database;
