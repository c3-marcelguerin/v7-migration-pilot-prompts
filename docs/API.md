# API Documentation

## Base URL
`http://localhost:3000`

## Authentication
No authentication required for this version.

## Response Format
All responses are in JSON format. Error responses include an `error` field with a descriptive message.

---

## Analysis Management

### Create Analysis
Create a new analysis session from gathered C3 type data.

**Endpoint:** `POST /analysis`

**Request Body:**
```json
{
  "rootType": "string",
  "timestamp": "ISO 8601 string", 
  "typeCount": "number",
  "edgeCount": "number",
  "types": [
    {
      "typeName": "string",
      "fieldCount": "number",
      "relationships": [
        {
          "fieldName": "string",
          "fieldType": "reference|collection",
          "referencedType": "string"
        }
      ],
      "error": "string (optional)"
    }
  ],
  "edges": [
    {
      "from": "string",
      "to": "string", 
      "fieldName": "string",
      "fieldType": "reference|collection"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "sessionId": "number",
  "analysis": {
    "rootType": "string",
    "timestamp": "string",
    "summary": {
      "totalTypes": "number",
      "totalEdges": "number", 
      "cycleBreakingEdges": "number",
      "startingTypes": "number"
    },
    "topologicalOrder": ["string"],
    "complexityLevels": {
      "typeName": {
        "complexity": "S|M|L",
        "edgeCount": "number"
      }
    },
    "workstreams": {
      "workstreams": [["string"]],
      "totalWorkstreams": "number",
      "minParallelWorkstreams": "number", 
      "maxParallelWorkstreams": "number"
    },
    "cycleBreakingEdges": ["string"]
  }
}
```

### Get Analysis
Retrieve analysis results for a session.

**Endpoint:** `GET /analysis/{sessionId}`

**Response:** `200 OK`
Returns the same analysis object as create analysis.

### List Sessions
Get all analysis sessions.

**Endpoint:** `GET /sessions`

**Response:** `200 OK`
```json
[
  {
    "id": "number",
    "root_type": "string",
    "timestamp": "string",
    "type_count": "number",
    "edge_count": "number", 
    "created_at": "string"
  }
]
```

---

## Type Information

### List Types
Get all types in the current analysis session.

**Endpoint:** `GET /types`

**Response:** `200 OK`
```json
[
  {
    "id": "number",
    "session_id": "number",
    "type_name": "string",
    "field_count": "number",
    "complexity_level": "S|M|L",
    "migration_order": "number",
    "error_message": "string|null"
  }
]
```

### Get Type Details
Get detailed information about a specific type.

**Endpoint:** `GET /types/{typeName}`

**Response:** `200 OK`
```json
{
  "name": "string",
  "fieldCount": "number",
  "error": "string|null",
  "relationships": [
    {
      "fieldName": "string",
      "fieldType": "reference|collection", 
      "referencedType": "string"
    }
  ],
  "dependencies": ["string"],
  "dependents": ["string"],
  "dependencyCount": "number",
  "dependentCount": "number"
}
```

### Get Type Dependencies
Get all dependencies (direct and transitive) for a type.

**Endpoint:** `GET /types/{typeName}/dependencies`

**Response:** `200 OK`
```json
{
  "typeName": "string",
  "dependencies": ["string"]
}
```

### Get Type Dependents
Get all dependents (direct and transitive) for a type.

**Endpoint:** `GET /types/{typeName}/dependents`

**Response:** `200 OK`
```json
{
  "typeName": "string", 
  "dependents": ["string"]
}
```

### Get Migration Sequence
Get the migration sequence needed for a specific type.

**Endpoint:** `GET /types/{typeName}/migration-sequence`

**Response:** `200 OK`
```json
{
  "typeName": "string",
  "migrationSequence": ["string"]
}
```

---

## Migration Planning

### Get Starting Types
Get types that should be migrated first (no dependencies).

**Endpoint:** `GET /migration/starting-types`

**Response:** `200 OK`
```json
{
  "startingTypes": ["string"]
}
```

### Get Topological Order
Get the complete migration order for all types.

**Endpoint:** `GET /migration/topological-order`

**Response:** `200 OK`
```json
[
  {
    "id": "number",
    "session_id": "number",
    "type_name": "string", 
    "order_index": "number",
    "level": "number"
  }
]
```

### Get Workstreams
Get analysis of parallel migration workstreams.

**Endpoint:** `GET /migration/workstreams`

**Response:** `200 OK`
```json
{
  "workstreams": [["string"]],
  "totalWorkstreams": "number",
  "minParallelWorkstreams": "number",
  "maxParallelWorkstreams": "number"
}
```

### Get Complexity Levels
Get types grouped by complexity level.

**Endpoint:** `GET /migration/complexity-levels`

**Response:** `200 OK`
```json
{
  "S": ["string"],
  "M": ["string"], 
  "L": ["string"]
}
```

---

## Relationships

### Get Edges
Get all type relationships (edges) in the graph.

**Endpoint:** `GET /edges`

**Response:** `200 OK`
```json
[
  {
    "id": "number",
    "session_id": "number",
    "from_type": "string",
    "to_type": "string",
    "field_name": "string",
    "field_type": "reference|collection",
    "is_cycle_breaking": "boolean"
  }
]
```

### Get Cycle Breaking Edges
Get edges that were removed to break cycles.

**Endpoint:** `GET /edges/cycle-breaking`

**Response:** `200 OK`
Returns array of edges with `is_cycle_breaking: true`.

---

## Data Management

### Clear All Data
Delete all analysis data from the database.

**Endpoint:** `DELETE /data`

**Response:** `200 OK`
```json
{
  "message": "All data cleared successfully"
}
```

---

## Health Check

### Health Status
Check if the API is running.

**Endpoint:** `GET /health`

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "ISO 8601 string"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid data format"
}
```

### 404 Not Found
```json
{
  "error": "Type not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Usage Examples

### Complete Migration Planning Workflow

```bash
# 1. Create analysis
curl -X POST http://localhost:3000/analysis \\
  -H "Content-Type: application/json" \\
  -d @gathered-data.json

# 2. Get starting types
curl http://localhost:3000/migration/starting-types

# 3. Get workstream analysis  
curl http://localhost:3000/migration/workstreams

# 4. Get complexity levels for resource planning
curl http://localhost:3000/migration/complexity-levels

# 5. Get migration sequence for specific type
curl http://localhost:3000/types/MyImportantType/migration-sequence
```

### Type Analysis

```bash
# Get type details
curl http://localhost:3000/types/UserAccount

# Get all dependencies
curl http://localhost:3000/types/UserAccount/dependencies  

# Get all dependents
curl http://localhost:3000/types/UserAccount/dependents
```

### Quality Assurance

```bash
# Check for cycle-breaking edges
curl http://localhost:3000/edges/cycle-breaking

# Get all edges to verify relationships
curl http://localhost:3000/edges
```
