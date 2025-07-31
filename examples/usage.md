# C3 Type Migration Analyzer - Usage Examples

This document provides practical examples of how to use the C3 Type Migration Analyzer.

## Example Workflow

### Step 1: Gather Data from C3 Environment

Copy and paste the following snippet into your Chrome Developer Tools console while connected to a C3 environment:

```javascript
// This snippet is also available in src/dataGatherer.js
(function() {
    'use strict';

    // ... (full script from dataGatherer.js)
    
    // Usage example:
    const data = gatherTypeData('UserAccount');
    
    // Copy the JSON output that appears in console
})();
```

### Step 2: Start the Analysis Server

```bash
# Initialize database (first time only)
npm run init-db

# Start the server
npm start
# or for development with auto-reload
npm run dev
```

### Step 3: Submit Data for Analysis

```bash
# Save your gathered data to a file (e.g., data.json) and submit it
curl -X POST http://localhost:3000/analysis \
  -H "Content-Type: application/json" \
  -d @data.json
```

Expected response:
```json
{
  "sessionId": 1,
  "analysis": {
    "rootType": "UserAccount",
    "summary": {
      "totalTypes": 25,
      "totalEdges": 35,
      "cycleBreakingEdges": 1,
      "startingTypes": 3
    },
    "topologicalOrder": ["Role", "Permission", "User", "UserAccount", ...],
    "complexityLevels": {
      "Role": {"complexity": "S", "edgeCount": 1},
      "UserAccount": {"complexity": "L", "edgeCount": 12}
    }
  }
}
```

## Migration Planning Examples

### Find Starting Types for Migration

```bash
curl http://localhost:3000/migration/starting-types
```

Response:
```json
{
  "startingTypes": ["Role", "Permission", "Status"]
}
```

**Interpretation**: Start your migration with these types as they have no dependencies.

### Get Complete Migration Order

```bash
curl http://localhost:3000/migration/topological-order
```

Response:
```json
[
  {"type_name": "Role", "order_index": 0, "level": 0},
  {"type_name": "Permission", "order_index": 1, "level": 0},
  {"type_name": "User", "order_index": 2, "level": 0},
  {"type_name": "UserAccount", "order_index": 3, "level": 0}
]
```

### Analyze Parallel Workstreams

```bash
curl http://localhost:3000/migration/workstreams
```

Response:
```json
{
  "workstreams": [
    ["Role", "User", "UserAccount"],
    ["Permission", "AclEntry"],
    ["Status", "Order", "OrderItem"]
  ],
  "totalWorkstreams": 3,
  "minParallelWorkstreams": 1,
  "maxParallelWorkstreams": 3
}
```

**Interpretation**: You can have up to 3 parallel teams working on different workstreams simultaneously.

### Get Complexity Assessment

```bash
curl http://localhost:3000/migration/complexity-levels
```

Response:
```json
{
  "S": ["Role", "Permission", "Status", "SimpleConfig"],
  "M": ["User", "Order", "Product", "Category"],
  "L": ["UserAccount", "ComplexEntity", "MegaType"]
}
```

**Use this for resource allocation**:
- **S (Small)**: Junior developers, 1-2 days
- **M (Medium)**: Mid-level developers, 3-5 days  
- **L (Large)**: Senior developers, 1-2 weeks

## Type-Specific Analysis

### Get Dependencies for a Specific Type

```bash
curl http://localhost:3000/types/UserAccount/dependencies
```

Response:
```json
{
  "typeName": "UserAccount",
  "dependencies": ["User", "Role", "Permission", "Profile"]
}
```

**Interpretation**: These types must be migrated before `UserAccount`.

### Get Migration Sequence for a Type

```bash
curl http://localhost:3000/types/UserAccount/migration-sequence
```

Response:
```json
{
  "typeName": "UserAccount", 
  "migrationSequence": ["Role", "Permission", "User", "Profile", "UserAccount"]
}
```

**Interpretation**: This is the exact order to migrate types if you want to migrate `UserAccount`.

### Get Type Details

```bash
curl http://localhost:3000/types/UserAccount
```

Response:
```json
{
  "name": "UserAccount",
  "fieldCount": 12,
  "dependencies": ["User", "Role", "Permission"],
  "dependents": ["Session", "AuditLog"],
  "dependencyCount": 3,
  "dependentCount": 2
}
```

## Quality Assurance

### Check for Broken Cycles

```bash
curl http://localhost:3000/edges/cycle-breaking
```

Response:
```json
[
  {
    "from_type": "UserAccount",
    "to_type": "User", 
    "field_name": "createdBy",
    "field_type": "reference",
    "is_cycle_breaking": true
  }
]
```

**Action Required**: Review these edges manually. The system broke a cycle by removing this relationship from the graph. You may need special handling for these circular dependencies.

## Real-World Migration Planning

### Example: Planning a 100-Type Migration

Given the analysis results:

```bash
# 1. Check workstreams
curl http://localhost:3000/migration/workstreams
# Result: 4 workstreams possible

# 2. Get complexity distribution  
curl http://localhost:3000/migration/complexity-levels
# Result: 45 Small, 30 Medium, 25 Large types

# 3. Get topological order
curl http://localhost:3000/migration/topological-order
# Result: Complete migration sequence
```

**Migration Plan**:
- **Team Size**: 4 teams (one per workstream)
- **Timeline**: 
  - Small types: 45 × 2 days = 90 team-days
  - Medium types: 30 × 4 days = 120 team-days  
  - Large types: 25 × 8 days = 200 team-days
  - **Total**: 410 team-days ÷ 4 teams = ~103 calendar days

### Example: Critical Path Analysis

For a specific high-priority type:

```bash
# Find all dependents (what gets blocked if this fails)
curl http://localhost:3000/types/CriticalType/dependents

# Find migration sequence (what must be done first)  
curl http://localhost:3000/types/CriticalType/migration-sequence
```

## Troubleshooting

### No Starting Types Found
If `/migration/starting-types` returns an empty array, you likely have circular dependencies:

```bash
curl http://localhost:3000/edges/cycle-breaking
```

Review the cycle-breaking edges and plan manual intervention.

### Uneven Workstream Distribution
If one workstream has significantly more types:

```bash
# Analyze individual workstreams
curl http://localhost:3000/migration/workstreams
```

Consider splitting large workstreams or rebalancing teams.

### High Complexity Types
For types with complexity level "L":

```bash
curl http://localhost:3000/types/{TypeName}
```

Review the `dependencyCount` and `dependentCount` to understand why it's complex.

## Integration with Project Management

### Jira Ticket Creation
Use the API data to auto-generate tickets:

```bash
# Get all types with complexity levels
curl http://localhost:3000/types | jq '.[] | {name: .type_name, complexity: .complexity_level}'
```

### Progress Tracking
Monitor migration progress by tracking completed types:

```bash
# Example: Mark types as "done" and track progress
# (You would extend the API to support this)
```

### Risk Assessment
Identify high-risk types (those with many dependents):

```bash
curl http://localhost:3000/types | jq 'map(select(.dependentCount > 10))'
```

## Command-Line Utilities

For convenience, you can create shell functions:

```bash
# Add to your .bashrc or .zshrc
function migration-start() {
    curl -s http://localhost:3000/migration/starting-types | jq -r '.startingTypes[]'
}

function migration-sequence() {
    curl -s "http://localhost:3000/types/$1/migration-sequence" | jq -r '.migrationSequence[]'
}

function migration-workstreams() {
    curl -s http://localhost:3000/migration/workstreams | jq '.workstreams'
}

# Usage:
# migration-start
# migration-sequence UserAccount  
# migration-workstreams
```
