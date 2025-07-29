/**
 * Type Relationship Analyzer for C3 Types
 * 
 * This module analyzes relationships between C3 types based on their reference 
 * and collection fields, creates a directed graph, handles cycles, and produces 
 * a topological sort.
 */

class TypeGraph {
    constructor() {
        this.edges = new Map(); // Map<string, Set<string>> - adjacency list
        this.visited = new Set(); // Types that have been analyzed
        this.visiting = new Set(); // Types currently being processed (for cycle detection)
        this.depths = new Map(); // Map<string, number> - depth from root for each type
    }

    /**
     * Add a directed edge from source type to target type
     */
    addEdge(sourceType, targetType) {
        if (!this.edges.has(sourceType)) {
            this.edges.set(sourceType, new Set());
        }
        this.edges.get(sourceType).add(targetType);
    }

    /**
     * Get all outgoing edges from a type
     */
    getEdges(typeName) {
        return this.edges.get(typeName) || new Set();
    }

    /**
     * Get all types in the graph
     */
    getAllTypes() {
        const types = new Set();
        for (const [source, targets] of this.edges) {
            types.add(source);
            for (const target of targets) {
                types.add(target);
            }
        }
        return types;
    }

    /**
     * Remove an edge from the graph
     */
    removeEdge(sourceType, targetType) {
        if (this.edges.has(sourceType)) {
            this.edges.get(sourceType).delete(targetType);
        }
    }
}

class TypeAnalyzer {
    constructor() {
        this.graph = new TypeGraph();
    }

    /**
     * Analyze type relationships starting from a root type
     */
    analyzeFromRoot(rootTypeName) {
        this.graph = new TypeGraph();
        this.graph.depths.set(rootTypeName, 0);
        this._analyzeType(rootTypeName, 0);
        this._detectAndResolveCycles();
        return this._topologicalSort();
    }

    /**
     * Recursively analyze a type and its dependencies
     */
    _analyzeType(typeName, depth) {
        // Skip if already analyzed
        if (this.graph.visited.has(typeName)) {
            return;
        }

        // Check for cycle
        if (this.graph.visiting.has(typeName)) {
            // Cycle detected - we'll handle this later in _detectAndResolveCycles
            return;
        }

        this.graph.visiting.add(typeName);
        this.graph.depths.set(typeName, Math.min(this.graph.depths.get(typeName) || Infinity, depth));

        try {
            const type = c3Type(typeName);
            const fieldTypes = type.fieldTypes();

            for (const field of fieldTypes) {
                const valueType = field.valueType();
                
                if (valueType.isReference()) {
                    // Direct reference field
                    const referencedTypeName = valueType.typeName();
                    this.graph.addEdge(typeName, referencedTypeName);
                    this._analyzeType(referencedTypeName, depth + 1);
                } else if (valueType.isArray()) {
                    // Collection field - analyze element type
                    const elementType = valueType.elementType();
                    if (!elementType.isPrimitive()) {
                        const elementTypeName = elementType.typeName();
                        this.graph.addEdge(typeName, elementTypeName);
                        this._analyzeType(elementTypeName, depth + 1);
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not analyze type ${typeName}: ${error.message}`);
        }

        this.graph.visiting.delete(typeName);
        this.graph.visited.add(typeName);
    }

    /**
     * Detect cycles and resolve them by removing edges to types closest to root
     */
    _detectAndResolveCycles() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];

        const dfs = (typeName, path) => {
            if (recursionStack.has(typeName)) {
                // Found a cycle
                const cycleStart = path.indexOf(typeName);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, typeName]);
                return;
            }

            if (visited.has(typeName)) {
                return;
            }

            visited.add(typeName);
            recursionStack.add(typeName);
            path.push(typeName);

            for (const neighbor of this.graph.getEdges(typeName)) {
                dfs(neighbor, path);
            }

            path.pop();
            recursionStack.delete(typeName);
        };

        // Find all cycles
        for (const type of this.graph.getAllTypes()) {
            if (!visited.has(type)) {
                dfs(type, []);
            }
        }

        // Resolve cycles by removing edges to types closest to root
        for (const cycle of cycles) {
            let minDepth = Infinity;
            let targetType = null;
            let sourceType = null;

            for (let i = 0; i < cycle.length - 1; i++) {
                const current = cycle[i];
                const next = cycle[i + 1];
                const nextDepth = this.graph.depths.get(next) || Infinity;

                if (nextDepth < minDepth) {
                    minDepth = nextDepth;
                    targetType = next;
                    sourceType = current;
                }
            }

            if (sourceType && targetType) {
                console.log(`Removing cycle edge: ${sourceType} -> ${targetType} (depth ${minDepth})`);
                this.graph.removeEdge(sourceType, targetType);
            }
        }
    }

    /**
     * Perform topological sort using Kahn's algorithm
     */
    _topologicalSort() {
        const inDegree = new Map();
        const allTypes = this.graph.getAllTypes();

        // Initialize in-degree count
        for (const type of allTypes) {
            inDegree.set(type, 0);
        }

        // Calculate in-degrees
        for (const [source, targets] of this.graph.edges) {
            for (const target of targets) {
                inDegree.set(target, (inDegree.get(target) || 0) + 1);
            }
        }

        // Find all types with no incoming edges
        const queue = [];
        for (const [type, degree] of inDegree) {
            if (degree === 0) {
                queue.push(type);
            }
        }

        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            // For each neighbor of current
            for (const neighbor of this.graph.getEdges(current)) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // Check if there are remaining cycles (shouldn't happen after cycle resolution)
        if (result.length !== allTypes.size) {
            throw new Error("Cycle detected in graph after resolution - this should not happen");
        }

        return result;
    }

    /**
     * Get the graph edges for debugging/visualization
     */
    getGraphEdges() {
        const edges = [];
        for (const [source, targets] of this.graph.edges) {
            for (const target of targets) {
                edges.push({ source, target });
            }
        }
        return edges;
    }

    /**
     * Get statistics about the analysis
     */
    getStats() {
        const allTypes = this.graph.getAllTypes();
        const totalEdges = this.getGraphEdges().length;
        
        return {
            totalTypes: allTypes.size,
            totalEdges,
            analyzedTypes: this.graph.visited.size
        };
    }
}

/**
 * Main function to analyze type relationships and get topological sort
 * @param {string} rootTypeName - The root type to start analysis from
 * @returns {Object} Analysis results including topological sort and stats
 */
function analyzeTypeRelationships(rootTypeName) {
    const analyzer = new TypeAnalyzer();
    
    try {
        const topologicalOrder = analyzer.analyzeFromRoot(rootTypeName);
        const edges = analyzer.getGraphEdges();
        const stats = analyzer.getStats();
        
        return {
            success: true,
            rootType: rootTypeName,
            topologicalOrder,
            edges,
            stats
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            rootType: rootTypeName
        };
    }
}

/**
 * Utility function to print analysis results in a readable format
 */
function printAnalysisResults(results) {
    if (!results.success) {
        console.error(`Analysis failed for root type '${results.rootType}': ${results.error}`);
        return;
    }

    console.log(`\n=== Type Relationship Analysis for '${results.rootType}' ===`);
    console.log(`Total types analyzed: ${results.stats.totalTypes}`);
    console.log(`Total edges found: ${results.stats.totalEdges}`);
    console.log(`Types processed: ${results.stats.analyzedTypes}`);

    console.log(`\n--- Topological Order ---`);
    results.topologicalOrder.forEach((type, index) => {
        console.log(`${index + 1}. ${type}`);
    });

    console.log(`\n--- Type Dependencies (Edges) ---`);
    results.edges.forEach(edge => {
        console.log(`${edge.source} -> ${edge.target}`);
    });
}

// Export the main functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TypeAnalyzer,
        TypeGraph,
        analyzeTypeRelationships,
        printAnalysisResults
    };
}
