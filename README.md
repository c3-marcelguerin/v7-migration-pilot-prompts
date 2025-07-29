# C3 Type Relationship Analyzer

This project provides tools to analyze relationships between C3 types based on their reference and collection fields. It creates a directed graph of type dependencies, handles cycles, and produces a topological sort of the types.

## Features

- **Type Dependency Analysis**: Analyzes C3 types to find reference and collection field relationships
- **Cycle Detection**: Identifies cycles in the type dependency graph
- **Cycle Resolution**: Eliminates cycles by removing edges to types closest to the root
- **Topological Sort**: Produces a topological ordering of types based on their dependencies
- **Comprehensive Statistics**: Provides detailed information about the analysis results

## Files

- `src/typeAnalyzer.js` - Main implementation of the type relationship analyzer
- `src/examples.js` - Usage examples and demonstrations
- `src/typeInfo.js` - Existing utility functions for type analysis

## Core Classes

### TypeGraph
Represents a directed graph of type dependencies with methods for:
- Adding/removing edges
- Tracking visited types
- Managing type depths for cycle resolution

### TypeAnalyzer
Main analysis engine that:
- Traverses the type system starting from a root type
- Builds the dependency graph
- Detects and resolves cycles
- Produces topological sort

## Quick Start

```javascript
// Basic usage
const results = analyzeTypeRelationships('YourRootTypeName');
printAnalysisResults(results);

// Advanced usage with TypeAnalyzer class
const analyzer = new TypeAnalyzer();
const topologicalOrder = analyzer.analyzeFromRoot('YourRootTypeName');
const edges = analyzer.getGraphEdges();
const stats = analyzer.getStats();
```

## API Reference

### Main Functions

#### `analyzeTypeRelationships(rootTypeName)`
Analyzes type relationships starting from a root type and returns complete results.

**Parameters:**
- `rootTypeName` (string): The name of the C3 type to start analysis from

**Returns:**
```javascript
{
    success: boolean,
    rootType: string,
    topologicalOrder: string[],  // Array of type names in topological order
    edges: Array<{source: string, target: string}>,  // Dependency edges
    stats: {
        totalTypes: number,      // Total types in dependency graph
        totalEdges: number,      // Total dependency relationships
        analyzedTypes: number    // Types that were fully processed
    }
}
```

#### `printAnalysisResults(results)`
Prints analysis results in a human-readable format.

### TypeAnalyzer Methods

#### `analyzeFromRoot(rootTypeName)`
Performs complete analysis and returns topological sort array.

#### `getGraphEdges()`
Returns array of all dependency edges in the graph.

#### `getStats()`
Returns statistics about the analysis.

## How It Works

### 1. Type Traversal
Starting from a root type, the analyzer:
- Gets all field types using `type.fieldTypes()`
- Identifies reference fields using `valueType.isReference()`
- Identifies collection fields using `valueType.isArray()`
- For collections, analyzes element types using `valueType.elementType()`

### 2. Graph Construction
- Creates directed edges from types that reference other types
- Ensures each edge is unique (no duplicate edges between same types)
- Tracks depth of each type from the root for cycle resolution

### 3. Cycle Detection
Uses depth-first search to identify cycles in the dependency graph.

### 4. Cycle Resolution
When cycles are found:
- Identifies the type in the cycle closest to the root (smallest depth)
- Removes the edge pointing to that type
- This breaks the cycle while preserving maximum dependency information

### 5. Topological Sort
Uses Kahn's algorithm to produce a topological ordering where:
- Types with no dependencies come first
- Each type appears before all types that depend on it

## Usage Examples

### Basic Analysis
```javascript
const results = analyzeTypeRelationships('Customer');
if (results.success) {
    console.log(`Found ${results.stats.totalTypes} related types`);
    console.log('Topological order:', results.topologicalOrder);
}
```

### Find Most Connected Types
```javascript
const results = analyzeTypeRelationships('Order');
const dependencyCounts = new Map();

results.edges.forEach(edge => {
    dependencyCounts.set(edge.source, (dependencyCounts.get(edge.source) || 0) + 1);
});

const mostConnected = Array.from(dependencyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

console.log('Types with most dependencies:', mostConnected);
```

### Direct Analyzer Usage
```javascript
const analyzer = new TypeAnalyzer();
const topologicalOrder = analyzer.analyzeFromRoot('Product');

// Get additional insights
const edges = analyzer.getGraphEdges();
const leafTypes = topologicalOrder.filter(type => 
    !edges.some(edge => edge.source === type)
);

console.log('Leaf types (no dependencies):', leafTypes);
```

## Error Handling

The analyzer includes robust error handling:
- Invalid type names are caught and logged as warnings
- Analysis continues even if some types can't be processed
- Cycle detection prevents infinite loops
- Clear error messages for debugging

## Limitations

- Only analyzes reference and collection fields (ignores primitive fields)
- Requires access to C3 type system functions (`c3Type`, `fieldTypes`, etc.)
- Performance depends on the size and complexity of the type graph

## Testing

See `src/examples.js` for comprehensive usage examples that can be adapted for testing with your specific C3 types.

## Contributing

When modifying the analyzer:
1. Ensure cycle detection and resolution still work correctly
2. Maintain the topological sort property
3. Add appropriate error handling for edge cases
4. Update examples and documentation as needed
