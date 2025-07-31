# C3 Type Migration Analyzer

A comprehensive tool for analyzing C3 type relationships and generating migration sequences for type system upgrades.

## Overview

This tool consists of two main components:

1. **JavaScript Data Gatherer**: A browser-based snippet that extracts C3 type relationship data
2. **Node.js Analysis API**: A REST API server that analyzes the data and provides migration planning insights

## Features

- **Type Relationship Analysis**: Discovers dependencies between C3 types through reference and collection fields
- **Cycle Detection**: Identifies and breaks circular dependencies for migration planning
- **Topological Sorting**: Orders types for migration based on dependencies
- **Complexity Assessment**: Categorizes types by complexity (S/M/L) based on relationship count
- **Workstream Analysis**: Identifies parallel migration paths
- **Migration Sequencing**: Provides step-by-step migration order for any type

## Quick Start

### Prerequisites

- Node.js 16+ 
- Access to a C3 environment for data gathering

### Installation

```bash
npm install
```

### Initialize Database

```bash
npm run init-db
```

### Start the Server

```bash
npm start
```

The API will be available at `http://localhost:3000`

## Usage

### Step 1: Gather Data from C3 Environment

1. Open Chrome Developer Tools in your C3 environment
2. Copy and paste the contents of `src/dataGatherer.js` into the console
3. Run: `gatherTypeData('YourRootTypeName')`
4. Copy the JSON output

### Step 2: Analyze Data

Send the gathered data to the API:

```bash
curl -X POST http://localhost:3000/analysis \\
  -H "Content-Type: application/json" \\
  -d @your-data.json
```

### Step 3: Query Results

Use the API endpoints to get migration insights:

```bash
# Get starting types for migration
curl http://localhost:3000/migration/starting-types

# Get topological order
curl http://localhost:3000/migration/topological-order

# Get dependencies for a specific type
curl http://localhost:3000/types/YourTypeName/dependencies

# Get migration sequence for a type
curl http://localhost:3000/types/YourTypeName/migration-sequence
```

## API Reference

### Analysis Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analysis` | Create new analysis from gathered data |
| GET | `/analysis/{sessionId}` | Get analysis results |
| GET | `/sessions` | List all analysis sessions |
| DELETE | `/data` | Clear all data |

### Type Information

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/types` | List all types in current analysis |
| GET | `/types/{typeName}` | Get detailed type information |
| GET | `/types/{typeName}/dependencies` | Get all dependencies for a type |
| GET | `/types/{typeName}/dependents` | Get all dependents for a type |
| GET | `/types/{typeName}/migration-sequence` | Get migration sequence for a type |

### Migration Planning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/migration/starting-types` | Get types to start migration with |
| GET | `/migration/topological-order` | Get complete migration order |
| GET | `/migration/workstreams` | Get parallel workstream analysis |
| GET | `/migration/complexity-levels` | Get complexity level assignments |

### Relationships

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/edges` | Get all type relationships |
| GET | `/edges/cycle-breaking` | Get edges removed to break cycles |

## Data Format

### Input Data Format

The JavaScript gatherer produces data in this format:

```json
{
  "rootType": "YourRootType",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "typeCount": 100,
  "edgeCount": 150,
  "types": [
    {
      "typeName": "TypeA",
      "fieldCount": 5,
      "relationships": [
        {
          "fieldName": "fieldB",
          "fieldType": "reference",
          "referencedType": "TypeB"
        }
      ]
    }
  ],
  "edges": [
    {
      "from": "TypeA",
      "to": "TypeB", 
      "fieldName": "fieldB",
      "fieldType": "reference"
    }
  ]
}
```

### Analysis Output Format

```json
{
  "rootType": "YourRootType",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "summary": {
    "totalTypes": 100,
    "totalEdges": 150,
    "cycleBreakingEdges": 2,
    "startingTypes": 5
  },
  "topologicalOrder": ["TypeD", "TypeC", "TypeB", "TypeA"],
  "complexityLevels": {
    "TypeA": { "complexity": "L", "edgeCount": 10 },
    "TypeB": { "complexity": "M", "edgeCount": 5 }
  },
  "workstreams": {
    "workstreams": [["TypeA", "TypeB"], ["TypeC"]],
    "totalWorkstreams": 2,
    "minParallelWorkstreams": 1,
    "maxParallelWorkstreams": 2
  }
}
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database file path

### Ignored Types

The following types are treated as primitives and ignored during analysis:

AclEntry, ActionCondition, AdminGroup, F, Idp, IdpCertificate, Impersonatee, MLTrainingJob, Meta, Obj, Permission, Ref, Role, T1, T2, T3, TypeRef, Unit, UnitComponent, Url, User, VersionEdit

## Algorithm Details

### Edge Direction

Dependencies are modeled as directed edges from dependent to dependency:
- If TypeA references TypeB, edge goes from TypeA → TypeB
- This means TypeB must be migrated before TypeA

### Cycle Breaking

When cycles are detected:
1. DFS traversal identifies back edges that create cycles
2. Edges are removed based on depth from root type
3. Cycle-breaking edges are tracked and reported

### Complexity Levels

Types are assigned complexity based on total edge count (incoming + outgoing):
- **S (Small)**: Bottom 45% of types by edge count
- **M (Medium)**: Next 30% of types  
- **L (Large)**: Top 25% of types

### Workstream Analysis

Connected components in the undirected version of the graph represent workstreams that can be migrated in parallel.

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Development

Start in development mode with auto-reload:

```bash
npm run dev
```

## Migration Planning Guidelines

### Starting Your Migration

1. **Identify Starting Points**: Use `/migration/starting-types` to find types with no dependencies
2. **Plan Workstreams**: Use `/migration/workstreams` to understand parallel migration opportunities
3. **Assess Complexity**: Use `/migration/complexity-levels` to allocate team resources

### Migration Sequence

1. Start with types that have no dependencies (leaf nodes)
2. Progress through the topological order
3. Types in the same workstream can be done in parallel
4. Always migrate dependencies before dependents

### Handling Cycles

- Cycle-breaking edges are reported but not removed from the original data
- The system breaks cycles at the edge closest to the root type
- Review cycle-breaking edges manually to understand implications

## Troubleshooting

### Common Issues

1. **No Types Found**: Check that the root type name is correct and exists in C3
2. **Cycles Not Breaking**: Verify edge direction logic matches your dependency model
3. **API Errors**: Check that data format matches expected structure

### Performance Considerations

- Large type hierarchies (>1000 types) may take several seconds to analyze
- Database operations are optimized for typical usage patterns
- Consider pagination for very large result sets

## Contributing

When extending this tool:

1. Add comprehensive tests for new functionality
2. Update API documentation for new endpoints  
3. Maintain backward compatibility in data formats
4. Follow existing code style and patterns

## License

MIT License - see LICENSE file for details.
