# C3 Type Migration Analyzer

A comprehensive tool for analyzing C3 type relationships and generating migration plans based on dependency graphs and topological sorting.

## Overview

The C3 Type Migration Analyzer helps teams plan the migration of C3 types by:

- **Analyzing dependencies** between types based on reference and collection fields
- **Building directed graphs** representing type relationships
- **Detecting and resolving cycles** in the dependency graph
- **Generating topological sorts** for proper migration ordering
- **Identifying workstreams** for parallel migration efforts
- **Assigning complexity levels** to help with resource planning

## Quick Start

### Basic Usage

```javascript
const { MigrationPlanner } = require('./index');

// Create planner and analyze from root type
const planner = new MigrationPlanner();
planner.analyze('YourRootTypeName');

// Get types to start migration with
const startingTypes = planner.getStartingTypes();
console.log('Start with:', startingTypes);

// Get migration order for a specific type
const sequence = planner.getMigrationSequenceFor('SpecificType');
console.log('Migration order:', sequence.join(' -> '));

// Print comprehensive migration plan
planner.printMigrationPlan();
```

### Command Line Interface

```bash
# Analyze a type and show summary
node index.js MyRootType

# Show detailed migration plan
node index.js MyRootType --print-plan

# Get dependencies for a specific type
node index.js MyRootType --get-deps SpecificType

# Run tests
node index.js test

# Show examples
node index.js examples
```

## Core Concepts

### Dependency Direction

The analyzer uses the direction: **dependent type → dependency type**

- If TypeA references TypeB, there's an edge from TypeA to TypeB
- TypeB must be migrated before TypeA
- In the topological sort, dependencies appear before dependents

### Ignored Types

The following types are treated as primitives and ignored during analysis:
- AclEntry, ActionCondition, AdminGroup, F, Idp, IdpCertificate
- Impersonatee, MLTrainingJob, Meta, Obj, Permission, Ref
- Role, T1, T2, T3, TypeRef, Unit, UnitComponent, Url, User, VersionEdit

### Complexity Levels

Types are assigned complexity levels based on the number of dependencies:
- **S (Small)**: 45% of types - Quick wins, simple migrations
- **M (Medium)**: 30% of types - Moderate effort required  
- **L (Large)**: 25% of types - Major effort, complex migrations

### Cycle Resolution

When cycles are detected, the analyzer removes the edge involving the type closest to the root (smallest depth), ensuring a valid topological ordering.

## API Reference

### MigrationPlanner

The main class for migration planning.

#### Methods

##### `analyze(rootTypeName)`
Analyzes type relationships starting from a root type.

**Parameters:**
- `rootTypeName` (string): The root type to start analysis from

**Returns:** `MigrationPlanner` (for method chaining)

##### `getStartingTypes()`
Returns types with no dependencies that can be migrated first.

**Returns:** `Array<string>` - Array of type names

##### `getDependenciesFor(typeName)`
Returns all types that must be migrated before the given type.

**Parameters:**
- `typeName` (string): The type to get dependencies for

**Returns:** `Array<string>` - Array of dependency type names

##### `getWorkstreams()`
Returns connected components representing parallel migration streams.

**Returns:** `Object`
```javascript
{
  count: number,                    // Number of workstreams
  minParallelStreams: number,       // Minimum parallel streams
  maxParallelStreams: number,       // Maximum parallel streams
  workstreams: Array<{              // Workstream details
    id: number,
    types: Array<string>,
    size: number
  }>
}
```

##### `getMigrationSequenceFor(typeName)`
Returns migration order for a specific type and its dependencies.

**Parameters:**
- `typeName` (string): The type to get migration sequence for

**Returns:** `Array<string>` - Types in migration order

##### `getCompleteMigrationOrder()`
Returns complete topological sort of all analyzed types.

**Returns:** `Array<string>` - All types in migration order

##### `getComplexityAnalysis()`
Returns complexity levels for all types.

**Returns:** `Object`
```javascript
{
  S: { types: Array<string>, count: number },
  M: { types: Array<string>, count: number },
  L: { types: Array<string>, count: number }
}
```

##### `getAnalysisReport()`
Returns comprehensive analysis report.

**Returns:** `Object`
```javascript
{
  summary: {
    totalTypes: number,
    totalDependencies: number,
    cyclesDetected: number,
    workstreamCount: number
  },
  migration: {
    startingTypes: Array<string>,
    migrationOrder: Array<string>,
    workstreams: Object
  },
  complexity: Object,
  cycles: Array<Array<string>>
}
```

##### `printMigrationPlan()`
Prints a formatted migration plan to the console.

**Returns:** `void`

### TypeAnalyzer

Lower-level class for graph analysis (used internally by MigrationPlanner).

#### Methods

##### `analyze(rootTypeName)`
Performs the core type relationship analysis.

**Returns:** `Object` - Raw analysis results including edges, cycles, and topological sort

##### `getStartingTypes()`, `getDependencies(typeName)`, `getWorkstreams()`, `getMigrationSequence(typeName)`
Similar to MigrationPlanner methods but operate on the raw analyzer state.

## Migration Planning Strategies

### 1. Sequential Migration
For teams wanting a simple, linear approach:

```javascript
const order = planner.getCompleteMigrationOrder();
console.log('Migrate in this order:', order.join(' -> '));
```

### 2. Parallel Workstreams
For teams that can work in parallel:

```javascript
const workstreams = planner.getWorkstreams();
console.log(`Use ${workstreams.count} parallel teams`);

workstreams.workstreams.forEach((ws, index) => {
  console.log(`Team ${index + 1}: ${ws.types.join(', ')}`);
});
```

### 3. Complexity-Based Planning
For resource allocation based on complexity:

```javascript
const complexity = planner.getComplexityAnalysis();

console.log('Quick Wins (S):', complexity.S.types);
console.log('Moderate Effort (M):', complexity.M.types);
console.log('Major Projects (L):', complexity.L.types);
```

### 4. Dependency-First Approach
For critical types with many dependents:

```javascript
const criticalTypes = ['ImportantType1', 'ImportantType2'];

criticalTypes.forEach(type => {
  const deps = planner.getDependenciesFor(type);
  console.log(`${type} requires: ${deps.join(', ')}`);
  
  const sequence = planner.getMigrationSequenceFor(type);
  console.log(`Migration path: ${sequence.join(' -> ')}`);
});
```

## Examples

### Basic Analysis
```javascript
const { MigrationPlanner } = require('./index');

const planner = new MigrationPlanner();
planner.analyze('MyApplicationType');

// Find starting points
const startingTypes = planner.getStartingTypes();
console.log('Start migration with:', startingTypes);

// Get workstreams for parallel development
const workstreams = planner.getWorkstreams();
console.log(`Can run ${workstreams.count} parallel workstreams`);
```

### Team Planning
```javascript
// Assign complexity-based work
const complexity = planner.getComplexityAnalysis();

console.log('Junior Team (Small types):', complexity.S.types);
console.log('Senior Team (Large types):', complexity.L.types);

// Check specific dependencies
const criticalType = 'CoreBusinessType';
const deps = planner.getDependenciesFor(criticalType);
console.log(`${criticalType} depends on:`, deps);
```

### Migration Sequence Planning
```javascript
// Get complete migration plan
const report = planner.getAnalysisReport();

console.log(`Total effort: ${report.summary.totalTypes} types`);
console.log(`Can start with: ${report.migration.startingTypes.join(', ')}`);

if (report.summary.cyclesDetected > 0) {
  console.log(`Warning: ${report.summary.cyclesDetected} cycles were resolved`);
}
```

## Testing

Run the comprehensive test suite:

```bash
npm test
# or
node test/test.js
```

The test suite covers:
- Basic graph construction
- Cycle detection and resolution
- Topological sorting
- Complexity calculation
- API functionality
- Integration scenarios

## Performance Considerations

- **Memory Usage**: The analyzer keeps the full dependency graph in memory
- **Traversal**: Each type is analyzed only once to prevent infinite loops
- **Cycle Detection**: Uses DFS with cycle breaking for performance
- **Large Graphs**: For very large type systems (>10,000 types), consider analyzing smaller subgraphs

## Troubleshooting

### Common Issues

1. **"Type not found" errors**: Ensure the type exists and is accessible via `c3Type()`
2. **Infinite loops**: The analyzer prevents this, but check for complex circular references
3. **Missing dependencies**: Verify all referenced types are available in the C3 system
4. **Memory issues**: For large type systems, analyze in smaller chunks

### Debug Tips

```javascript
// Enable detailed logging
const planner = new MigrationPlanner();
planner.analyze('YourType');

// Check for cycles
const report = planner.getAnalysisReport();
if (report.cycles.length > 0) {
  console.log('Cycles found:', report.cycles);
}

// Verify specific relationships
const deps = planner.getDependenciesFor('ProblematicType');
console.log('Dependencies:', deps);
```

## Contributing

To extend the analyzer:

1. **Add new analysis methods** to `TypeAnalyzer` class
2. **Create high-level APIs** in `MigrationPlanner` class  
3. **Add tests** for new functionality
4. **Update documentation** and examples

## License

MIT License - see LICENSE file for details.
