const request = require('supertest');
const TypeAnalysisAPI = require('../src/api');

describe('TypeAnalysisAPI', () => {
    let api;
    let app;

    const mockData = {
        rootType: 'TypeA',
        timestamp: '2025-01-01T00:00:00.000Z',
        typeCount: 3,
        edgeCount: 2,
        types: [
            { typeName: 'TypeA', fieldCount: 2, relationships: [] },
            { typeName: 'TypeB', fieldCount: 1, relationships: [] },
            { typeName: 'TypeC', fieldCount: 1, relationships: [] }
        ],
        edges: [
            { from: 'TypeA', to: 'TypeB', fieldName: 'fieldB', fieldType: 'reference' },
            { from: 'TypeA', to: 'TypeC', fieldName: 'fieldC', fieldType: 'reference' }
        ]
    };

    beforeAll(async () => {
        api = new TypeAnalysisAPI();
        await api.initialize();
        app = api.app;
    });

    afterAll(async () => {
        await api.stop();
    });

    beforeEach(async () => {
        await api.db.clearAllData();
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('healthy');
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('Data Management', () => {
        it('should clear all data', async () => {
            const response = await request(app)
                .delete('/data')
                .expect(200);

            expect(response.body.message).toBe('All data cleared successfully');
        });
    });

    describe('Analysis Creation', () => {
        it('should create analysis from valid data', async () => {
            const response = await request(app)
                .post('/analysis')
                .send(mockData)
                .expect(201);

            expect(response.body.sessionId).toBeDefined();
            expect(response.body.analysis).toBeDefined();
            expect(response.body.analysis.rootType).toBe('TypeA');
        });

        it('should reject invalid data format', async () => {
            const invalidData = { invalid: 'data' };

            await request(app)
                .post('/analysis')
                .send(invalidData)
                .expect(400);
        });

        it('should handle missing required fields', async () => {
            const incompleteData = { rootType: 'TypeA' };

            await request(app)
                .post('/analysis')
                .send(incompleteData)
                .expect(400);
        });
    });

    describe('Analysis Retrieval', () => {
        let sessionId;

        beforeEach(async () => {
            const response = await request(app)
                .post('/analysis')
                .send(mockData);
            sessionId = response.body.sessionId;
        });

        it('should retrieve analysis by session ID', async () => {
            const response = await request(app)
                .get(`/analysis/${sessionId}`)
                .expect(200);

            expect(response.body.rootType).toBe('TypeA');
            expect(response.body.topologicalOrder).toBeDefined();
        });

        it('should return 404 for invalid session ID', async () => {
            await request(app)
                .get('/analysis/999999')
                .expect(404);
        });
    });

    describe('Sessions Management', () => {
        it('should list all analysis sessions', async () => {
            await request(app)
                .post('/analysis')
                .send(mockData);

            const response = await request(app)
                .get('/sessions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('Types Endpoints', () => {
        let sessionId;

        beforeEach(async () => {
            const response = await request(app)
                .post('/analysis')
                .send(mockData);
            sessionId = response.body.sessionId;
        });

        it('should list all types', async () => {
            const response = await request(app)
                .get('/types')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
        });

        it('should get type details', async () => {
            const response = await request(app)
                .get('/types/TypeA')
                .expect(200);

            expect(response.body.name).toBe('TypeA');
            expect(response.body.dependencies).toBeDefined();
            expect(response.body.dependents).toBeDefined();
        });

        it('should return 404 for non-existent type', async () => {
            await request(app)
                .get('/types/NonExistentType')
                .expect(404);
        });

        it('should get type dependencies', async () => {
            const response = await request(app)
                .get('/types/TypeA/dependencies')
                .expect(200);

            expect(response.body.typeName).toBe('TypeA');
            expect(Array.isArray(response.body.dependencies)).toBe(true);
        });

        it('should get type dependents', async () => {
            const response = await request(app)
                .get('/types/TypeB/dependents')
                .expect(200);

            expect(response.body.typeName).toBe('TypeB');
            expect(Array.isArray(response.body.dependents)).toBe(true);
        });

        it('should get migration sequence for type', async () => {
            const response = await request(app)
                .get('/types/TypeA/migration-sequence')
                .expect(200);

            expect(response.body.typeName).toBe('TypeA');
            expect(Array.isArray(response.body.migrationSequence)).toBe(true);
        });
    });

    describe('Migration Planning Endpoints', () => {
        beforeEach(async () => {
            await request(app)
                .post('/analysis')
                .send(mockData);
        });

        it('should get starting types for migration', async () => {
            const response = await request(app)
                .get('/migration/starting-types')
                .expect(200);

            expect(Array.isArray(response.body.startingTypes)).toBe(true);
        });

        it('should get topological order', async () => {
            const response = await request(app)
                .get('/migration/topological-order')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should get workstreams analysis', async () => {
            const response = await request(app)
                .get('/migration/workstreams')
                .expect(200);

            expect(response.body.workstreams).toBeDefined();
            expect(response.body.totalWorkstreams).toBeDefined();
        });

        it('should get complexity levels', async () => {
            const response = await request(app)
                .get('/migration/complexity-levels')
                .expect(200);

            expect(typeof response.body).toBe('object');
        });
    });

    describe('Edges Endpoints', () => {
        beforeEach(async () => {
            await request(app)
                .post('/analysis')
                .send(mockData);
        });

        it('should get all edges', async () => {
            const response = await request(app)
                .get('/edges')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should get cycle breaking edges', async () => {
            const response = await request(app)
                .get('/edges/cycle-breaking')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown endpoints', async () => {
            await request(app)
                .get('/unknown-endpoint')
                .expect(404);
        });

        it('should handle malformed JSON', async () => {
            await request(app)
                .post('/analysis')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });
    });

    describe('No Active Session Handling', () => {
        it('should return 404 when no active session exists', async () => {
            // Ensure no session is active by clearing data first
            await request(app)
                .delete('/data');
                
            await request(app)
                .get('/types')
                .expect(404);
        });
    });
});
