const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const Database = require('./database');
const TypeGraphAnalyzer = require('./analyzer');

class TypeAnalysisAPI {
    constructor() {
        this.app = express();
        this.db = new Database();
        this.analyzer = new TypeGraphAnalyzer();
        this.currentSessionId = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        // Clear all data
        this.app.delete('/data', this.clearAllData.bind(this));

        // Analysis session management
        this.app.post('/analysis', this.createAnalysis.bind(this));
        this.app.get('/analysis/:sessionId', this.getAnalysis.bind(this));
        this.app.get('/sessions', this.getSessions.bind(this));

        // Type queries
        this.app.get('/types', this.getTypes.bind(this));
        this.app.get('/types/:typeName', this.getTypeDetails.bind(this));
        this.app.get('/types/:typeName/dependencies', this.getTypeDependencies.bind(this));
        this.app.get('/types/:typeName/dependents', this.getTypeDependents.bind(this));
        this.app.get('/types/:typeName/migration-sequence', this.getMigrationSequence.bind(this));

        // Migration planning
        this.app.get('/migration/starting-types', this.getStartingTypes.bind(this));
        this.app.get('/migration/topological-order', this.getTopologicalOrder.bind(this));
        this.app.get('/migration/workstreams', this.getWorkstreams.bind(this));
        this.app.get('/migration/complexity-levels', this.getComplexityLevels.bind(this));

        // Edges and relationships
        this.app.get('/edges', this.getEdges.bind(this));
        this.app.get('/edges/cycle-breaking', this.getCycleBreakingEdges.bind(this));

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('API Error:', err);
            
            // Handle JSON parsing errors
            if (err.type === 'entity.parse.failed') {
                return res.status(400).json({ error: 'Invalid JSON format' });
            }
            
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    async initialize() {
        await this.db.initialize();
        console.log('API initialized successfully');
    }

    // Route handlers

    async clearAllData(req, res) {
        try {
            await this.db.clearAllData();
            this.currentSessionId = null;
            this.analyzer = new TypeGraphAnalyzer();
            res.json({ message: 'All data cleared successfully' });
        } catch (error) {
            console.error('Error clearing data:', error);
            res.status(500).json({ error: 'Failed to clear data' });
        }
    }

    async createAnalysis(req, res) {
        try {
            const data = req.body;
            
            if (!data.rootType || !data.types || !data.edges) {
                return res.status(400).json({ error: 'Invalid data format' });
            }

            // Create analysis session
            const sessionResult = await this.db.run(
                'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
                [data.rootType, data.timestamp, data.typeCount, data.edgeCount]
            );
            
            this.currentSessionId = sessionResult.lastID;

            // Load data into analyzer
            this.analyzer.loadData(data);
            const analysis = this.analyzer.getAnalysis();

            // Store types
            for (const typeInfo of data.types) {
                const complexity = analysis.complexityLevels[typeInfo.typeName];
                await this.db.run(
                    'INSERT INTO types (session_id, type_name, field_count, complexity_level, error_message) VALUES (?, ?, ?, ?, ?)',
                    [this.currentSessionId, typeInfo.typeName, typeInfo.fieldCount, 
                     complexity?.complexity || 'S', typeInfo.error || null]
                );
            }

            // Store edges
            for (const edge of data.edges) {
                const isCycleBreaking = analysis.cycleBreakingEdges.includes(`${edge.from}->${edge.to}`);
                await this.db.run(
                    'INSERT INTO edges (session_id, from_type, to_type, field_name, field_type, is_cycle_breaking) VALUES (?, ?, ?, ?, ?, ?)',
                    [this.currentSessionId, edge.from, edge.to, edge.fieldName, edge.fieldType, isCycleBreaking]
                );
            }

            // Store topological order
            for (let i = 0; i < analysis.topologicalOrder.length; i++) {
                const typeName = analysis.topologicalOrder[i];
                await this.db.run(
                    'INSERT INTO topological_order (session_id, type_name, order_index, level) VALUES (?, ?, ?, ?)',
                    [this.currentSessionId, typeName, i, Math.floor(i / 10)] // Simple leveling
                );
            }

            res.status(201).json({
                sessionId: this.currentSessionId,
                analysis: analysis
            });
        } catch (error) {
            console.error('Error creating analysis:', error);
            res.status(500).json({ error: 'Failed to create analysis' });
        }
    }

    async getAnalysis(req, res) {
        try {
            const sessionId = parseInt(req.params.sessionId);
            
            if (sessionId !== this.currentSessionId) {
                return res.status(404).json({ error: 'Analysis session not found' });
            }

            const analysis = this.analyzer.getAnalysis();
            res.json(analysis);
        } catch (error) {
            console.error('Error getting analysis:', error);
            res.status(500).json({ error: 'Failed to get analysis' });
        }
    }

    async getSessions(req, res) {
        try {
            const sessions = await this.db.all('SELECT * FROM analysis_sessions ORDER BY created_at DESC');
            res.json(sessions);
        } catch (error) {
            console.error('Error getting sessions:', error);
            res.status(500).json({ error: 'Failed to get sessions' });
        }
    }

    async getTypes(req, res) {
        try {
            if (!this.currentSessionId) {
                return res.status(404).json({ error: 'No active analysis session' });
            }

            const types = await this.db.all(
                'SELECT * FROM types WHERE session_id = ? ORDER BY type_name',
                [this.currentSessionId]
            );
            res.json(types);
        } catch (error) {
            console.error('Error getting types:', error);
            res.status(500).json({ error: 'Failed to get types' });
        }
    }

    async getTypeDetails(req, res) {
        try {
            const typeName = req.params.typeName;
            
            if (!this.analyzer.types.has(typeName)) {
                return res.status(404).json({ error: 'Type not found' });
            }

            const typeInfo = this.analyzer.types.get(typeName);
            const dependencies = this.analyzer.getDependencies(typeName);
            const dependents = this.analyzer.getDependents(typeName);

            res.json({
                ...typeInfo,
                dependencies,
                dependents,
                dependencyCount: dependencies.length,
                dependentCount: dependents.length
            });
        } catch (error) {
            console.error('Error getting type details:', error);
            res.status(500).json({ error: 'Failed to get type details' });
        }
    }

    async getTypeDependencies(req, res) {
        try {
            const typeName = req.params.typeName;
            const dependencies = this.analyzer.getDependencies(typeName);
            res.json({ typeName, dependencies });
        } catch (error) {
            console.error('Error getting dependencies:', error);
            res.status(500).json({ error: 'Failed to get dependencies' });
        }
    }

    async getTypeDependents(req, res) {
        try {
            const typeName = req.params.typeName;
            const dependents = this.analyzer.getDependents(typeName);
            res.json({ typeName, dependents });
        } catch (error) {
            console.error('Error getting dependents:', error);
            res.status(500).json({ error: 'Failed to get dependents' });
        }
    }

    async getMigrationSequence(req, res) {
        try {
            const typeName = req.params.typeName;
            const dependencies = this.analyzer.getDependencies(typeName);
            const analysis = this.analyzer.getAnalysis();
            
            // Find the migration sequence for this type
            const sequence = [];
            for (const type of analysis.topologicalOrder) {
                if (dependencies.includes(type) || type === typeName) {
                    sequence.push(type);
                }
            }

            res.json({ typeName, migrationSequence: sequence });
        } catch (error) {
            console.error('Error getting migration sequence:', error);
            res.status(500).json({ error: 'Failed to get migration sequence' });
        }
    }

    async getStartingTypes(req, res) {
        try {
            const startingTypes = this.analyzer.getStartingTypes();
            res.json({ startingTypes });
        } catch (error) {
            console.error('Error getting starting types:', error);
            res.status(500).json({ error: 'Failed to get starting types' });
        }
    }

    async getTopologicalOrder(req, res) {
        try {
            if (!this.currentSessionId) {
                return res.status(404).json({ error: 'No active analysis session' });
            }

            const order = await this.db.all(
                'SELECT * FROM topological_order WHERE session_id = ? ORDER BY order_index',
                [this.currentSessionId]
            );
            res.json(order);
        } catch (error) {
            console.error('Error getting topological order:', error);
            res.status(500).json({ error: 'Failed to get topological order' });
        }
    }

    async getWorkstreams(req, res) {
        try {
            const analysis = this.analyzer.getAnalysis();
            res.json(analysis.workstreams);
        } catch (error) {
            console.error('Error getting workstreams:', error);
            res.status(500).json({ error: 'Failed to get workstreams' });
        }
    }

    async getComplexityLevels(req, res) {
        try {
            if (!this.currentSessionId) {
                return res.status(404).json({ error: 'No active analysis session' });
            }

            const types = await this.db.all(
                'SELECT type_name, complexity_level FROM types WHERE session_id = ? ORDER BY complexity_level, type_name',
                [this.currentSessionId]
            );

            const grouped = types.reduce((acc, type) => {
                if (!acc[type.complexity_level]) {
                    acc[type.complexity_level] = [];
                }
                acc[type.complexity_level].push(type.type_name);
                return acc;
            }, {});

            res.json(grouped);
        } catch (error) {
            console.error('Error getting complexity levels:', error);
            res.status(500).json({ error: 'Failed to get complexity levels' });
        }
    }

    async getEdges(req, res) {
        try {
            if (!this.currentSessionId) {
                return res.status(404).json({ error: 'No active analysis session' });
            }

            const edges = await this.db.all(
                'SELECT * FROM edges WHERE session_id = ? ORDER BY from_type, to_type',
                [this.currentSessionId]
            );
            res.json(edges);
        } catch (error) {
            console.error('Error getting edges:', error);
            res.status(500).json({ error: 'Failed to get edges' });
        }
    }

    async getCycleBreakingEdges(req, res) {
        try {
            if (!this.currentSessionId) {
                return res.status(404).json({ error: 'No active analysis session' });
            }

            const edges = await this.db.all(
                'SELECT * FROM edges WHERE session_id = ? AND is_cycle_breaking = TRUE ORDER BY from_type, to_type',
                [this.currentSessionId]
            );
            res.json(edges);
        } catch (error) {
            console.error('Error getting cycle breaking edges:', error);
            res.status(500).json({ error: 'Failed to get cycle breaking edges' });
        }
    }

    async start(port = 3000) {
        await this.initialize();
        
        return new Promise((resolve) => {
            this.server = this.app.listen(port, () => {
                console.log(`Type Analysis API server running on port ${port}`);
                resolve();
            });
        });
    }

    async stop() {
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(resolve);
            });
        }
        await this.db.close();
    }
}

module.exports = TypeAnalysisAPI;
