const Database = require('../src/database');
const path = require('path');
const fs = require('fs');

describe('Database', () => {
    let db;
    const testDbPath = path.join(__dirname, '../data/test.db');

    beforeEach(async () => {
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        db = new Database(testDbPath);
        await db.initialize();
    });

    afterEach(async () => {
        await db.close();
        
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialization', () => {
        it('should create database file and tables', async () => {
            expect(fs.existsSync(testDbPath)).toBe(true);
        });

        it('should create all required tables', async () => {
            const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
            const tableNames = tables.map(t => t.name);
            
            expect(tableNames).toContain('analysis_sessions');
            expect(tableNames).toContain('types');
            expect(tableNames).toContain('edges');
            expect(tableNames).toContain('topological_order');
        });
    });

    describe('CRUD operations', () => {
        it('should insert and retrieve analysis session', async () => {
            const result = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 5, 3]
            );

            expect(result.lastID).toBeDefined();

            const session = await db.get('SELECT * FROM analysis_sessions WHERE id = ?', [result.lastID]);
            
            expect(session.root_type).toBe('TestType');
            expect(session.type_count).toBe(5);
            expect(session.edge_count).toBe(3);
        });

        it('should insert and retrieve types', async () => {
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            await db.run(
                'INSERT INTO types (session_id, type_name, field_count, complexity_level) VALUES (?, ?, ?, ?)',
                [sessionResult.lastID, 'TestType', 5, 'M']
            );

            const types = await db.all('SELECT * FROM types WHERE session_id = ?', [sessionResult.lastID]);
            
            expect(types).toHaveLength(1);
            expect(types[0].type_name).toBe('TestType');
            expect(types[0].complexity_level).toBe('M');
        });

        it('should insert and retrieve edges', async () => {
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 2, 1]
            );

            await db.run(
                'INSERT INTO edges (session_id, from_type, to_type, field_name, field_type) VALUES (?, ?, ?, ?, ?)',
                [sessionResult.lastID, 'TypeA', 'TypeB', 'fieldB', 'reference']
            );

            const edges = await db.all('SELECT * FROM edges WHERE session_id = ?', [sessionResult.lastID]);
            
            expect(edges).toHaveLength(1);
            expect(edges[0].from_type).toBe('TypeA');
            expect(edges[0].to_type).toBe('TypeB');
        });

        it('should insert and retrieve topological order', async () => {
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            await db.run(
                'INSERT INTO topological_order (session_id, type_name, order_index, level) VALUES (?, ?, ?, ?)',
                [sessionResult.lastID, 'TestType', 0, 0]
            );

            const order = await db.all('SELECT * FROM topological_order WHERE session_id = ?', [sessionResult.lastID]);
            
            expect(order).toHaveLength(1);
            expect(order[0].type_name).toBe('TestType');
            expect(order[0].order_index).toBe(0);
        });
    });

    describe('data clearing', () => {
        it('should clear all data from tables', async () => {
            // Insert test data
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            await db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [sessionResult.lastID, 'TestType', 1]
            );

            // Clear all data
            await db.clearAllData();

            // Verify data is cleared
            const sessions = await db.all('SELECT * FROM analysis_sessions');
            const types = await db.all('SELECT * FROM types');
            
            expect(sessions).toHaveLength(0);
            expect(types).toHaveLength(0);
        });
    });

    describe('error handling', () => {
        it('should handle invalid SQL gracefully', async () => {
            await expect(db.run('INVALID SQL')).rejects.toThrow();
        });

        it('should handle constraint violations', async () => {
            // Insert a valid analysis session first
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            // Insert a type with the valid session
            await db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [sessionResult.lastID, 'TestType', 1]
            );

            // Try to insert duplicate type in same session (should fail due to unique constraint)
            await expect(db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [sessionResult.lastID, 'TestType', 2] // Duplicate type name in same session
            )).rejects.toThrow();
        });
    });

    describe('unique constraints', () => {
        it('should enforce unique type names per session', async () => {
            const sessionResult = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            await db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [sessionResult.lastID, 'TestType', 1]
            );

            // Try to insert duplicate
            await expect(db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [sessionResult.lastID, 'TestType', 2]
            )).rejects.toThrow();
        });

        it('should allow same type name in different sessions', async () => {
            const session1 = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            const session2 = await db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                ['TestType', '2025-01-01T00:00:00.000Z', 1, 0]
            );

            await db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [session1.lastID, 'TestType', 1]
            );

            await db.run(
                'INSERT INTO types (session_id, type_name, field_count) VALUES (?, ?, ?)',
                [session2.lastID, 'TestType', 2]
            );

            const types = await db.all('SELECT * FROM types WHERE type_name = ?', ['TestType']);
            expect(types).toHaveLength(2);
        });
    });
});
