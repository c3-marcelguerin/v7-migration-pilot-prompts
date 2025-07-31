class TypeGraphAnalyzer {
    constructor() {
        this.types = new Map();
        this.edges = [];
        this.adjacencyList = new Map();
        this.reversedAdjacencyList = new Map();
        this.visitedForCycles = new Set();
        this.recursionStack = new Set();
        this.cycleBreakingEdges = new Set();
    }

    /**
     * Load type data from the gathered data
     * @param {Object} data - The data from the JavaScript snippet
     */
    loadData(data) {
        this.rootType = data.rootType;
        this.timestamp = data.timestamp;

        // Load types
        for (const typeInfo of data.types) {
            this.types.set(typeInfo.typeName, {
                name: typeInfo.typeName,
                fieldCount: typeInfo.fieldCount,
                error: typeInfo.error || null,
                relationships: typeInfo.relationships || []
            });
        }

        // Load edges - direction: from dependent to dependency (A depends on B: A -> B)
        this.edges = data.edges.map(edge => ({
            from: edge.from,
            to: edge.to,
            fieldName: edge.fieldName,
            fieldType: edge.fieldType
        }));

        this.buildAdjacencyLists();
        console.log(`Loaded ${this.types.size} types and ${this.edges.length} edges`);
    }

    /**
     * Build adjacency lists for graph traversal
     */
    buildAdjacencyLists() {
        this.adjacencyList.clear();
        this.reversedAdjacencyList.clear();

        // Initialize adjacency lists
        for (const typeName of this.types.keys()) {
            this.adjacencyList.set(typeName, []);
            this.reversedAdjacencyList.set(typeName, []);
        }

        // Build adjacency lists from edges
        for (const edge of this.edges) {
            if (!this.cycleBreakingEdges.has(`${edge.from}->${edge.to}`)) {
                this.adjacencyList.get(edge.from).push(edge.to);
                this.reversedAdjacencyList.get(edge.to).push(edge.from);
            }
        }
    }

    /**
     * Detect cycles in the graph using DFS
     * @param {string} node - Current node
     * @param {number} depth - Current depth from root
     * @returns {boolean} True if cycle detected
     */
    detectCyclesDFS(node, depth = 0) {
        if (this.recursionStack.has(node)) {
            // Cycle detected - find the edge to break
            this.breakCycleEdge(node, depth);
            return true;
        }

        if (this.visitedForCycles.has(node)) {
            return false;
        }

        this.visitedForCycles.add(node);
        this.recursionStack.add(node);

        const neighbors = this.adjacencyList.get(node) || [];
        for (const neighbor of neighbors) {
            if (this.detectCyclesDFS(neighbor, depth + 1)) {
                // Continue to detect other cycles
            }
        }

        this.recursionStack.delete(node);
        return false;
    }

    /**
     * Break cycle by removing edge from/to the node closest to root
     * @param {string} cycleNode - Node where cycle was detected
     * @param {number} depth - Current depth
     */
    breakCycleEdge(cycleNode, depth) {
        // Find edges that could be causing the cycle
        const neighbors = this.adjacencyList.get(cycleNode) || [];
        
        for (const neighbor of neighbors) {
            if (this.recursionStack.has(neighbor)) {
                const edgeKey = `${cycleNode}->${neighbor}`;
                this.cycleBreakingEdges.add(edgeKey);
                console.log(`Breaking cycle edge: ${edgeKey} at depth ${depth}`);
                break;
            }
        }
    }

    /**
     * Detect and break all cycles in the graph
     */
    detectAndBreakCycles() {
        this.visitedForCycles.clear();
        this.recursionStack.clear();
        this.cycleBreakingEdges.clear();

        // Start cycle detection from root type if available
        if (this.rootType && this.types.has(this.rootType)) {
            this.detectCyclesDFS(this.rootType);
        }

        // Check remaining unvisited nodes
        for (const typeName of this.types.keys()) {
            if (!this.visitedForCycles.has(typeName)) {
                this.detectCyclesDFS(typeName);
            }
        }

        // Rebuild adjacency lists without cycle-breaking edges
        this.buildAdjacencyLists();
        
        console.log(`Broke ${this.cycleBreakingEdges.size} cycle-breaking edges`);
    }

    /**
     * Perform topological sort using Kahn's algorithm
     * @returns {Array} Topologically sorted type names (dependencies first)
     */
    topologicalSort() {
        const inDegree = new Map();
        const result = [];
        const queue = [];

        // Initialize in-degree for all nodes
        for (const typeName of this.types.keys()) {
            inDegree.set(typeName, 0);
        }

        // Calculate in-degree (how many types depend on this type)
        for (const edge of this.edges) {
            if (!this.cycleBreakingEdges.has(`${edge.from}->${edge.to}`)) {
                inDegree.set(edge.to, inDegree.get(edge.to) + 1);
            }
        }

        // Find all nodes with in-degree 0 (no dependencies)
        for (const [typeName, degree] of inDegree) {
            if (degree === 0) {
                queue.push(typeName);
            }
        }

        // Process nodes
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            // Reduce in-degree for neighbors
            const neighbors = this.adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        if (result.length !== this.types.size) {
            console.warn(`Topological sort incomplete: ${result.length}/${this.types.size} types sorted`);
        }

        return result;
    }

    /**
     * Assign complexity levels based on edge count distribution
     * @returns {Object} Complexity assignment for each type
     */
    assignComplexityLevels() {
        const edgeCounts = [];
        const typeComplexity = new Map();

        // Calculate edge count for each type
        for (const typeName of this.types.keys()) {
            let edgeCount = 0;
            
            // Count outgoing edges (dependencies)
            edgeCount += (this.adjacencyList.get(typeName) || []).length;
            // Count incoming edges (dependents)
            edgeCount += (this.reversedAdjacencyList.get(typeName) || []).length;
            
            edgeCounts.push({ typeName, edgeCount });
        }

        // Sort by edge count
        edgeCounts.sort((a, b) => a.edgeCount - b.edgeCount);

        // Assign complexity levels
        const total = edgeCounts.length;
        const smallThreshold = Math.floor(total * 0.45);
        const mediumThreshold = Math.floor(total * 0.75);

        edgeCounts.forEach((item, index) => {
            let complexity;
            if (index < smallThreshold) {
                complexity = 'S';
            } else if (index < mediumThreshold) {
                complexity = 'M';
            } else {
                complexity = 'L';
            }
            
            typeComplexity.set(item.typeName, {
                complexity,
                edgeCount: item.edgeCount
            });
        });

        return typeComplexity;
    }

    /**
     * Get all dependencies for a given type
     * @param {string} typeName - The type to get dependencies for
     * @returns {Array} List of dependency type names
     */
    getDependencies(typeName) {
        const dependencies = new Set();
        const visited = new Set();
        const stack = [typeName];

        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            
            visited.add(current);
            const deps = this.adjacencyList.get(current) || [];
            
            for (const dep of deps) {
                dependencies.add(dep);
                stack.push(dep);
            }
        }

        return Array.from(dependencies);
    }

    /**
     * Get all dependents for a given type
     * @param {string} typeName - The type to get dependents for
     * @returns {Array} List of dependent type names
     */
    getDependents(typeName) {
        const dependents = new Set();
        const visited = new Set();
        const stack = [typeName];

        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            
            visited.add(current);
            const deps = this.reversedAdjacencyList.get(current) || [];
            
            for (const dep of deps) {
                dependents.add(dep);
                stack.push(dep);
            }
        }

        return Array.from(dependents);
    }

    /**
     * Get types to start migration with (no dependencies)
     * @returns {Array} List of starting type names
     */
    getStartingTypes() {
        const startingTypes = [];
        
        for (const typeName of this.types.keys()) {
            const dependencies = this.adjacencyList.get(typeName) || [];
            if (dependencies.length === 0) {
                startingTypes.push(typeName);
            }
        }
        
        return startingTypes;
    }

    /**
     * Analyze workstreams (connected components)
     * @returns {Object} Workstream analysis
     */
    analyzeWorkstreams() {
        const visited = new Set();
        const workstreams = [];

        for (const typeName of this.types.keys()) {
            if (!visited.has(typeName)) {
                const workstream = this.findConnectedComponent(typeName, visited);
                workstreams.push(workstream);
            }
        }

        return {
            workstreams,
            minParallelWorkstreams: 1,
            maxParallelWorkstreams: workstreams.length,
            totalWorkstreams: workstreams.length
        };
    }

    /**
     * Find connected component starting from a node
     * @param {string} startNode - Starting node
     * @param {Set} globalVisited - Global visited set
     * @returns {Array} Connected component nodes
     */
    findConnectedComponent(startNode, globalVisited) {
        const component = [];
        const stack = [startNode];
        const localVisited = new Set();

        while (stack.length > 0) {
            const current = stack.pop();
            if (localVisited.has(current)) continue;

            localVisited.add(current);
            globalVisited.add(current);
            component.push(current);

            // Add both outgoing and incoming neighbors
            const outgoing = this.adjacencyList.get(current) || [];
            const incoming = this.reversedAdjacencyList.get(current) || [];
            
            for (const neighbor of [...outgoing, ...incoming]) {
                if (!localVisited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        return component;
    }

    /**
     * Get complete analysis results
     * @returns {Object} Complete analysis
     */
    getAnalysis() {
        this.detectAndBreakCycles();
        const topologicalOrder = this.topologicalSort();
        const complexityLevels = this.assignComplexityLevels();
        const workstreams = this.analyzeWorkstreams();

        return {
            rootType: this.rootType,
            timestamp: this.timestamp,
            summary: {
                totalTypes: this.types.size,
                totalEdges: this.edges.length,
                cycleBreakingEdges: this.cycleBreakingEdges.size,
                startingTypes: this.getStartingTypes().length
            },
            topologicalOrder,
            complexityLevels: Object.fromEntries(complexityLevels),
            workstreams,
            cycleBreakingEdges: Array.from(this.cycleBreakingEdges)
        };
    }
}

module.exports = TypeGraphAnalyzer;
