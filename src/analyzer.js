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
     * @returns {Array} Topologically sorted type names (dependencies first for migration)
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

        // For migration planning, reverse the order so dependencies come first
        // If A->B means A depends on B, then B must be migrated before A
        result.reverse();

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
     * Analyze workstreams based on dependency convergence
     * @returns {Object} Workstream analysis
     */
    analyzeWorkstreams() {
        // Build workstreams by following dependency paths from leaves to roots
        const workstreams = this.buildDependencyWorkstreams();
        
        // Calculate parallelism
        const parallelism = this.calculateMaxParallelism(workstreams);
        
        return {
            workstreams: workstreams.map(ws => ws.types),
            workstreamDetails: workstreams,
            minParallelWorkstreams: 1,
            maxParallelWorkstreams: parallelism,
            totalWorkstreams: workstreams.length
        };
    }

    /**
     * Build workstreams by following dependency paths from leaf nodes
     * @returns {Array} Array of workstream objects
     */
    buildDependencyWorkstreams() {
        const workstreams = [];
        const processedTypes = new Set();
        
        // Start from leaf nodes (types with no outgoing dependencies)
        const leafNodes = this.findLeafNodes();
        
        // Build workstreams from each leaf node following dependency chains
        for (const leaf of leafNodes) {
            if (!processedTypes.has(leaf)) {
                const workstream = this.buildWorkstreamFromLeaf(leaf, processedTypes);
                if (workstream.types.length > 0) {
                    workstreams.push(workstream);
                }
            }
        }
        
        // Handle any remaining unprocessed types
        for (const typeName of this.types.keys()) {
            if (!processedTypes.has(typeName)) {
                const workstream = {
                    types: [typeName],
                    dependencies: []
                };
                workstreams.push(workstream);
                processedTypes.add(typeName);
            }
        }
        
        // Now calculate dependencies for all workstreams
        for (let i = 0; i < workstreams.length; i++) {
            workstreams[i].dependencies = this.calculateWorkstreamDependencies(workstreams[i].types, workstreams, i);
        }
        
        return workstreams;
    }
    
    /**
     * Find leaf nodes (types with no outgoing dependencies)
     * @returns {Array} Array of leaf node type names
     */
    findLeafNodes() {
        const leafNodes = [];
        
        for (const typeName of this.types.keys()) {
            const outgoing = this.adjacencyList.get(typeName) || [];
            if (outgoing.length === 0) {
                leafNodes.push(typeName);
            }
        }
        
        return leafNodes;
    }
    
    /**
     * Build a workstream starting from a leaf node and following incoming dependencies
     * @param {string} startNode - Starting leaf node
     * @param {Set} globalProcessed - Globally processed types
     * @returns {Object} Workstream object
     */
    buildWorkstreamFromLeaf(startNode, globalProcessed) {
        const workstreamTypes = [];
        const visited = new Set();
        let current = startNode;
        
        // Follow the dependency chain backwards
        while (current && !visited.has(current) && !globalProcessed.has(current)) {
            visited.add(current);
            globalProcessed.add(current);
            workstreamTypes.push(current);
            
            const incoming = this.reversedAdjacencyList.get(current) || [];
            
            // If there's exactly one incoming dependency, check if we can continue
            if (incoming.length === 1) {
                const parent = incoming[0];
                const parentOutgoing = this.adjacencyList.get(parent) || [];
                
                // Only continue if the parent has exactly one outgoing dependency (to current)
                // If parent has multiple outgoing dependencies, it should be its own workstream
                if (parentOutgoing.length === 1) {
                    current = parent;
                } else {
                    // Parent has multiple dependencies, stop here
                    break;
                }
            } else {
                // Multiple incoming dependencies or none, stop the chain
                break;
            }
        }
        
        // Reverse to get correct migration order (dependencies first)
        workstreamTypes.reverse();
        
        return {
            types: workstreamTypes,
            dependencies: []  // Will be calculated later
        };
    }
    
    /**
     * Calculate dependencies for a workstream
     * @param {Array} workstreamTypes - Types in the workstream
     * @param {Array} allWorkstreams - All workstreams
     * @param {number} currentIndex - Index of current workstream (to avoid self-dependency)
     * @returns {Array} Array of workstream indices that this workstream depends on
     */
    calculateWorkstreamDependencies(workstreamTypes, allWorkstreams, currentIndex = -1) {
        const dependencies = new Set();
        
        // Look at all dependencies of types in this workstream
        for (const type of workstreamTypes) {
            const typeDependencies = this.adjacencyList.get(type) || [];
            
            for (const dep of typeDependencies) {
                // Find which workstream contains this dependency
                for (let i = 0; i < allWorkstreams.length; i++) {
                    if (i !== currentIndex && allWorkstreams[i].types.includes(dep)) {
                        dependencies.add(i);
                        break;
                    }
                }
            }
        }
        
        return Array.from(dependencies);
    }
    
    /**
     * Calculate maximum number of workstreams that can run in parallel
     * @param {Array} workstreams - Array of workstream objects
     * @returns {number} Maximum parallel workstreams
     */
    calculateMaxParallelism(workstreams) {
        // Simulate the execution to find maximum parallelism
        const completed = new Set();
        const running = new Set();
        let maxParallel = 0;
        
        // Continue until all workstreams are completed
        while (completed.size < workstreams.length) {
            // Find workstreams that can start (all dependencies completed)
            const startable = [];
            for (let i = 0; i < workstreams.length; i++) {
                if (!completed.has(i) && !running.has(i)) {
                    const canStart = workstreams[i].dependencies.every(dep => completed.has(dep));
                    if (canStart) {
                        startable.push(i);
                    }
                }
            }
            
            // Start all startable workstreams
            for (const workstreamIndex of startable) {
                running.add(workstreamIndex);
            }
            
            // Update maximum parallelism
            maxParallel = Math.max(maxParallel, running.size);
            
            // Complete the first running workstream (simplified simulation)
            if (running.size > 0) {
                const firstRunning = running.values().next().value;
                running.delete(firstRunning);
                completed.add(firstRunning);
            } else {
                // No workstreams can start and none are running - should not happen in valid graph
                break;
            }
        }
        
        return Math.max(1, maxParallel);
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
