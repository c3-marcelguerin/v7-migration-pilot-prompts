/**
 * Type Migration Analyzer
 * 
 * Analyzes C3 type relationships and produces a topological sort for migration ordering.
 * Types with dependencies must be migrated before their dependents.
 */

/**
 * Types to ignore during analysis (treated as primitives)
 */
const IGNORED_TYPES = new Set([
    'AclEntry', 'ActionCondition', 'AdminGroup', 'F', 'Idp', 'IdpCertificate',
    'Impersonatee', 'MLTrainingJob', 'Meta', 'Obj', 'Permission', 'Ref',
    'Role', 'T1', 'T2', 'T3', 'TypeRef', 'Unit', 'UnitComponent', 'Url',
    'User', 'VersionEdit'
]);

/**
 * Main class for analyzing type relationships
 */
class TypeAnalyzer {
    constructor() {
        this.visitedTypes = new Set();
        this.edges = new Map(); // Map<string, Set<string>> - from type to dependencies
        this.typeDepths = new Map(); // Map<string, number> - depth from root
        this.complexityLevels = new Map(); // Map<string, string> - S, M, or L
    }

    /**
     * Analyzes type relationships starting from a root type
     * @param {string} rootTypeName - The root type to start analysis from
     * @returns {Object} Analysis results including edges, cycles, and topological sort
     */
    analyze(rootTypeName) {
        this.reset();
        
        // Build the dependency graph
        this._buildGraph(rootTypeName, 0);
        
        // Detect and resolve cycles
        const cycles = this._detectAndResolveCycles();
        
        // Calculate complexity levels
        this._calculateComplexityLevels();
        
        // Generate topological sort
        const topologicalSort = this._topologicalSort();
        
        return {
            edges: this._edgesToArray(),
            cycles: cycles,
            topologicalSort: topologicalSort,
            complexityLevels: Object.fromEntries(this.complexityLevels),
            stats: this._getStats()
        };
    }

    /**
     * Reset internal state for new analysis
     */
    reset() {
        this.visitedTypes.clear();
        this.edges.clear();
        this.typeDepths.clear();
        this.complexityLevels.clear();
    }

    /**
     * Build the dependency graph recursively
     * @param {string} typeName - Current type being analyzed
     * @param {number} depth - Current depth from root
     */
    _buildGraph(typeName, depth) {
        // Skip if already visited or should be ignored
        if (this.visitedTypes.has(typeName) || IGNORED_TYPES.has(typeName)) {
            return;
        }

        this.visitedTypes.add(typeName);
        this.typeDepths.set(typeName, depth);
        
        try {
            const type = c3Type(typeName);
            const properties = type.fieldTypes();
            
            // Initialize edges set for this type
            if (!this.edges.has(typeName)) {
                this.edges.set(typeName, new Set());
            }

            // Analyze reference and collection fields
            for (const property of properties) {
                const valueType = property.valueType();
                
                if (valueType.isReference()) {
                    const referencedType = valueType.typeName();
                    if (!IGNORED_TYPES.has(referencedType)) {
                        // Add edge: typeName depends on referencedType
                        this.edges.get(typeName).add(referencedType);
                        this._buildGraph(referencedType, depth + 1);
                    }
                } else if (valueType.isArray()) {
                    const elementType = valueType.elementType();
                    if (!elementType.isPrimitive()) {
                        const elementTypeName = elementType.typeName();
                        if (!IGNORED_TYPES.has(elementTypeName)) {
                            // Add edge: typeName depends on elementTypeName
                            this.edges.get(typeName).add(elementTypeName);
                            this._buildGraph(elementTypeName, depth + 1);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not analyze type ${typeName}: ${error.message}`);
        }
    }

    /**
     * Detect cycles in the graph and resolve them by removing edges
     * @returns {Array} List of detected cycles
     */
    _detectAndResolveCycles() {
        const cycles = [];
        const visiting = new Set();
        const visited = new Set();

        const dfs = (node, path) => {
            if (visiting.has(node)) {
                // Found a cycle
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart).concat([node]);
                cycles.push(cycle);
                
                // Remove the edge that creates the cycle
                // Remove edge from the node with the smallest depth to break the cycle
                const edgeToRemove = this._findEdgeToRemove(cycle);
                if (edgeToRemove) {
                    const [from, to] = edgeToRemove;
                    this.edges.get(from)?.delete(to);
                    console.log(`Removed edge ${from} -> ${to} to break cycle`);
                }
                return;
            }

            if (visited.has(node)) return;

            visiting.add(node);
            path.push(node);

            const dependencies = this.edges.get(node) || new Set();
            for (const dependency of dependencies) {
                dfs(dependency, path);
            }

            visiting.delete(node);
            visited.add(node);
            path.pop();
        };

        // Check for cycles starting from each unvisited node
        for (const node of this.edges.keys()) {
            if (!visited.has(node)) {
                dfs(node, []);
            }
        }

        return cycles;
    }

    /**
     * Find the best edge to remove to break a cycle
     * @param {Array} cycle - The cycle to break
     * @returns {Array|null} [from, to] edge to remove, or null
     */
    _findEdgeToRemove(cycle) {
        if (cycle.length < 2) return null;

        // Find the edge involving the node closest to root (smallest depth)
        let minDepth = Infinity;
        let edgeToRemove = null;

        for (let i = 0; i < cycle.length - 1; i++) {
            const from = cycle[i];
            const to = cycle[i + 1];
            const fromDepth = this.typeDepths.get(from) || Infinity;
            
            if (fromDepth < minDepth) {
                minDepth = fromDepth;
                edgeToRemove = [from, to];
            }
        }

        return edgeToRemove;
    }

    /**
     * Calculate complexity levels for all types
     */
    _calculateComplexityLevels() {
        const allTypes = Array.from(this.edges.keys());
        const edgeCounts = allTypes.map(type => ({
            type,
            edgeCount: this.edges.get(type)?.size || 0
        }));

        // Sort by edge count
        edgeCounts.sort((a, b) => a.edgeCount - b.edgeCount);

        const total = edgeCounts.length;
        const sThreshold = Math.floor(total * 0.45);
        const mThreshold = Math.floor(total * 0.75);

        for (let i = 0; i < edgeCounts.length; i++) {
            const { type } = edgeCounts[i];
            if (i < sThreshold) {
                this.complexityLevels.set(type, 'S');
            } else if (i < mThreshold) {
                this.complexityLevels.set(type, 'M');
            } else {
                this.complexityLevels.set(type, 'L');
            }
        }
    }

    /**
     * Perform topological sort to determine migration order
     * @returns {Array} Array of types in migration order (dependencies first)
     */
    _topologicalSort() {
        const result = [];
        const inDegree = new Map();
        const queue = [];

        // Initialize in-degree for all nodes
        for (const type of this.edges.keys()) {
            inDegree.set(type, 0);
        }

        // Calculate in-degree for each node
        // An edge from A to B means A depends on B, so B should come first
        // Therefore, A has an incoming edge (dependency on B)
        for (const [from, dependencies] of this.edges) {
            // 'from' depends on each item in 'dependencies'
            // So 'from' has incoming edges equal to the number of dependencies
            inDegree.set(from, (inDegree.get(from) || 0) + dependencies.size);
            
            // Make sure all dependencies are in the inDegree map
            for (const dep of dependencies) {
                if (!inDegree.has(dep)) {
                    inDegree.set(dep, 0);
                }
            }
        }

        // Start with nodes that have no dependencies (in-degree 0)
        for (const [type, degree] of inDegree) {
            if (degree === 0) {
                queue.push(type);
            }
        }

        // Process queue
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            // For each type that depends on current, reduce its in-degree
            for (const [dependent, dependencies] of this.edges) {
                if (dependencies.has(current)) {
                    const newDegree = inDegree.get(dependent) - 1;
                    inDegree.set(dependent, newDegree);
                    
                    if (newDegree === 0) {
                        queue.push(dependent);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Convert edges map to array format
     * @returns {Array} Array of edge objects
     */
    _edgesToArray() {
        const result = [];
        for (const [from, dependencies] of this.edges) {
            for (const to of dependencies) {
                result.push({ from, to });
            }
        }
        return result;
    }

    /**
     * Get analysis statistics
     * @returns {Object} Statistics about the analysis
     */
    _getStats() {
        const totalTypes = this.edges.size;
        const totalEdges = this._edgesToArray().length;
        const complexityCounts = {
            S: Array.from(this.complexityLevels.values()).filter(level => level === 'S').length,
            M: Array.from(this.complexityLevels.values()).filter(level => level === 'M').length,
            L: Array.from(this.complexityLevels.values()).filter(level => level === 'L').length
        };

        return {
            totalTypes,
            totalEdges,
            complexityCounts
        };
    }

    /**
     * Get types that can be migrated first (no dependencies)
     * @returns {Array} Array of type names that can be migrated first
     */
    getStartingTypes() {
        const result = [];
        for (const [type, dependencies] of this.edges) {
            if (dependencies.size === 0) {
                result.push(type);
            }
        }
        return result;
    }

    /**
     * Get all dependencies for a given type
     * @param {string} typeName - The type to get dependencies for
     * @returns {Array} Array of type names that must be migrated before this type
     */
    getDependencies(typeName) {
        const visited = new Set();
        const dependencies = new Set();

        const collectDependencies = (type) => {
            if (visited.has(type)) return;
            visited.add(type);

            const directDeps = this.edges.get(type) || new Set();
            for (const dep of directDeps) {
                dependencies.add(dep);
                collectDependencies(dep);
            }
        };

        collectDependencies(typeName);
        return Array.from(dependencies);
    }

    /**
     * Get migration workstreams (connected components)
     * @returns {Array} Array of workstreams, each containing connected types
     */
    getWorkstreams() {
        const visited = new Set();
        const workstreams = [];

        const dfs = (node, workstream) => {
            if (visited.has(node)) return;
            visited.add(node);
            workstream.add(node);

            // Follow both outgoing and incoming edges
            const outgoing = this.edges.get(node) || new Set();
            for (const neighbor of outgoing) {
                dfs(neighbor, workstream);
            }

            // Find incoming edges
            for (const [from, dependencies] of this.edges) {
                if (dependencies.has(node)) {
                    dfs(from, workstream);
                }
            }
        };

        for (const type of this.edges.keys()) {
            if (!visited.has(type)) {
                const workstream = new Set();
                dfs(type, workstream);
                workstreams.push(Array.from(workstream));
            }
        }

        return workstreams;
    }

    /**
     * Get migration sequence for a specific type
     * @param {string} typeName - The type to get migration sequence for
     * @returns {Array} Array of types in the order they should be migrated
     */
    getMigrationSequence(typeName) {
        const dependencies = this.getDependencies(typeName);
        const allTypes = [...dependencies, typeName];
        
        // Filter topological sort to only include relevant types
        const topSort = this._topologicalSort();
        return topSort.filter(type => allTypes.includes(type));
    }
}

module.exports = { TypeAnalyzer, IGNORED_TYPES };
