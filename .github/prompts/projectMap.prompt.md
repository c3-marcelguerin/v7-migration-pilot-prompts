---
mode: 'agent'
description: 'Write a program to analyze type relationships and produce a topological sort of the types.'
---
# Background

The term "type" in the context of this prompt refers to a C3 proprietary type system.
C3 types are like classes in other languages and can have fields and methods.

C3 type fields can be primitive types (like strings, integers, boolean, etc) or they may reference other C3 types, or they may be a collection of other C3 types (like a list or a map).

This project only examines a type's fields, specifically focusing only on the relationships between types based on their reference and collection fields.

Example usage of the functions in these instructions can be found in functions defined in the `src/typeInfo.js` file of the repository.

## Type References

A reference to a C3 type is itself a type known as a TypeRef (type reference).

The actual C3 type can be derived from a TypeRef using the `c3Type(typeRef)` function.

## C3 Type Names

The C3 type name is a string that uniquely identifies a C3 type within the system.
It can be obtained from a TypeRef using the `.typeName()` function.

## Fields

All fields for a type can be enumerated using the `.fieldTypes()` function on a C3 type, which returns a list of field references.

## Field Types

The field reference provides a function `.valueType()` that returns the ValueType (value type) of the field.
A value type is the metadata for any individual value that can be declared in the C3 type system.

## Reference Fields

When a field is a reference field, the value type function `.isReference()` will return true.
The type referenced by a reference field can be obtained using the `.typeName()` function on the value type.
Only the C3 type name of the reference is required for this project.

## Collection Fields

When a field is a collection field, the value type function `.isArray()` will return true.
The element type of the collection can be obtained using the `.elementType()` function on the value type.

Only the C3 type name of the element type is required for this project.

# Instructions

The C3 types analyzed by this program must be migrated to a new version.
The objective of this program is to analyze the interconnecting relationships between C3 types and produce a development sequence for the migration.
When determining the order of migration, the program must ensure that types are migrated in the correct order based on their dependencies: dependencies first, and then dependent C3 types.

Using the information provided above, write a set of programs that analyze the relationships between C3 types based on their reference and collection fields.

## Type Relationships

When a type A references another type B, it creates a directed edge in a graph.
The edge represents a dependency of A on B.
In the context of migration, B must be migrated before A, and all dependencies of A must be migrated before A.
This fact will be important when detecting cycles in the graph.

It is up to you to determine whether the edge should be directed from A to B or from B to A, but the important thing is that the direction of the edge must be consistent throughout the program.
Directed edges are unique in this graph, meaning that if A references B, there will be a single edge involving A and B, even if there are multiple fields in A that reference type B.

Select the direction that makes the most sense for the migration process and enables quick answers to the following questions:
- On which types should my team start the migration?
- What types must be migrated before a given type?
- What are the maximum number of parallel workstreams I can have during the migration?
See the section below for more details on workstreams.
- Show me the migration sequence for a given type (by type name).
Note that this should refer to the existing graph and not require a new graph because cycle detection would result in a different graph.

This analysis will start with a "root type" and will traverse the C3 type system to find all unique edges in the graph.
The program should not analyze types more than once.

The program should consist of two parts:
1. A JavaScript "snippet" that can be copied and run in the Chrome developer tools console which will gather the C3 type relationship graph data and export it in a format that can be used by the second part of the program.
2. A Node.js program that takes the exported data from the first part and analyzes the relationships.
Add endpoints to the Node.js program that will allow it to be run from the command line, and provide a comprehensive API for analyzing the data.

The Snippet should gather data required during the analysis phase.
Keep the Snippet simple and focused on gathering the necessary data.
Do not compute any analysis in the Snippet including complexity.

The Node.js program should analyze the data and produce a topological sort of the types, reflecting acceptable migration order, where dependencies are migrated before dependents.

## Type Complexity

During the analysis phase, for each type the program should assign a level of complexity based on the number of edges it has.
Break down the complexity of each type into three t-shirt sizes (S, M, L) based on the number of edges using the following criteria:
- S: 45% of the types
- M: 30% of the types
- L: 25% of the types

Only types that are `inUse` should be considered for complexity assignment.

## Type Status

Define the following fields for each vertex in the graph:
- An `inUse` field indicating whether the type is currently in use (true) or not (false).
A type that is not in use should not be considered for complexity assignment or workstream analysis.
- A `status` field to indicate whether the migration of that type is not started (Todo), in progress (Doing), or completed (Done)
- An `assignedTo` field indicating which team member is assigned to migrate that type
- A `startable` field indicating whether the type can be migrated (i.e., all dependencies have been migrated)

## Ignored Types

The program should ignore the following types, essentially treating them as "primitive" types that do not have any relationships with other types:
- AclEntry
- ActionCondition
- AdminGroup
- F
- Idp
- IdpCertificate
- Impersonatee
- MLTrainingJob
- Meta
- Obj
- Permission
- Ref
- Role
- T1
- T2
- T3
- TypeRef
- Unit
- UnitComponent
- Url
- User
- VersionEdit

## Workstreams

For the purposes of this migration, a "workstream" is a set of interconnected types that can be migrated in sequence without waiting for other types to be migrated.
Remember that migration of a type can only start when all its dependencies have been migrated.

Consider the following example edges:
TypeA -> TypeB
TypeA -> TypeC
TypeC -> TypeD

There are two workstreams in this example:
[TypeB]
[TypeD, TypeC]

TypeA is a workstream of its own, which cannot be started until the other two workstreams are completed.
A workstream ends when it joins another workstream or when it has no more dependencies.
When two or more workstreams join at the same type, none of the workstreams should contain that type.
A new workstream should be created for type where workstreams join together, and that type should be included in the new workstream and continue until another shared type is encountered.
A workstream is not startable until all its dependencies have been migrated.

### Max Workstreams

The calculation of the maximum number of parallel workstreams depends entirely on startable workstreams.
It might happen that a graph has two workstreams blocked by a single incomplete workstream.
In this case, the maximum number of parallel workstreams is 1, until the blocking workstream is completed, at which time the maximum number of parallel workstreams is now 2.

## Cycle Detection

The program should be careful to detect cycles in the graph.

If a cycle is detected, the program should eliminate the edge pointing "to" or "from" the type that is closest in depth to the root type, depending on the selected edge direction.
For example, if edge direction is "from relying type to dependent type" and TypeA references TypeB, and TypeB references TypeC, and TypeC references TypeA, the program should remove the edge from TypeA to TypeC if TypeA is the root type.
Alternatively, if the edge direction is "from dependent to relying type" and TypA references TypeB, and TypeB references TypeC, and TypeC references TypeA, then program should remove the edge from TypeA to TypeC if TypeA is the root type.

Pay particular attention to the direction of the edges, as this often impacts the proper function of the cycle detection algorithm.
For the purposes of migration planning, types that do not have dependencies should be migrated first, and types that have dependencies should be migrated after their dependencies.
The topological sort should reflect this order, regardless of the direction of the edges.

Using the graph of directed edges, the program should produce a topological sort of the types.
The topological sort should reflect acceptable migration order, where dependencies are migrated before dependents.

## API Design

Follow common semantics for REST API design, using plural nouns for resources and HTTP verbs for actions.
The API should provide endpoints to answer the key questions outlined above.

Add an endpoint to clear all data from the database.

The endpoint(s) for workstreams should return only startable workstreams and should accept a query parameter to request workstreams that are not startable.

The vertex fields should include update endpoints to update the inUse, status, assignedTo, and startable fields, since these fields will be updated during the migration process.

Add an endpoint to bulk upload an array of type names that are in use.
This endpoint should mark all types as not inUse except for the types in the array, and recompute type complexity and workstreams.
The endpoint should accept plain text, JSON, or CSV format.

## Storage

The Node.js program should store the raw graph data and important analysis metadata in a SQLite database.

## Documentation and Testing

Provide an example of how to use the program and a comprehensive documentation of the API.
Be sure to include any context you might need to expand this program in future prompts.
Future prompts may ask you to add additional REST API endpoints, add a UI, or integrate with other systems via REST APIs.

Build a set of tests to cover the functionality of the program.
When writing a test, express the expected behavior of what is being tested using "should" statements.
Be sure to run the tests to verify that the program works as expected.

If any of these instructions are not clear, please ask for clarification.
