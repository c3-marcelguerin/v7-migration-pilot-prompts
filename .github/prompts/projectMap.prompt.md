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

Using the information provided above, write a program that analyzes the relationships between C3 types based on their reference and collection fields.

When a type A references another type B, it creates a directed edge in a graph.
The edge represents a dependency of A on B.
In the context of migration, B must be migrated before A, and all dependencies of A must be migrated before A.

It is up to you to determine whether the edge should be directed from A to B or from B to A, but the important thing is that the direction of the edge must be consistent throughout the program.
Directed edges are unique in this graph, meaning that if A references B, there will be a single edge involving A and B, even if there are multiple fields in A that reference type B.

Select the direction that makes the most sense for the migration process and enables quick answers to the following questions:
- On which types should my team start the migration?
- What types must be migrated before a given type?
- What are the minimum and maximum number of parallel workstreams I can have during the migration?
For the purposes of this migration, a "workstream" is a set of interconnected types that can be migrated in sequence without waiting for other types to be migrated.
For example, if TypeA references TypeB and TypeB references TypeC, then TypeA, TypeB, and TypeC are all part of the same workstream.
- Show me the migration sequence for a given type (by type name)

This analysis will start with a "root type" and will traverse the C3 type system to find all unique edges in the graph.
The program should not analyze types more than once.

For each type, the program should assign a level of complexity based on the number of edges it has.
Break down the complexity of each type into three t-shirt sizes (S, M, L) based on the number of edges using the following criteria:
- S: 45% of the types
- M: 30% of the types
- L: 25% of the types

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

The program should be careful to detect cycles in the graph.

If a cycle is detected, the program should eliminate the edge pointing "to" or "from" the type that is closest in depth to the root type, depending on the selected edge direction.
For example, if edge direction is "from relying type to dependent type" and TypeA references TypeB, and TypeB references TypeC, and TypeC references TypeA, the program should remove the edge from TypeA to TypeC if TypeA is the root type.
Alternatively, if the edge direction is "from dependent to relying type" and TypA references TypeB, and TypeB references TypeC, and TypeC references TypeA, then program should remove the edge from TypeA to TypeC if TypeA is the root type.

Using the graph of directed edges, the program should produce a topological sort of the types.
The topological sort should reflect acceptable migration order, where dependencies are migrated before dependents.

Provide an example of how to use the program and a comprehensive documentation of the API.

Build a set of tests to cover the functionality of the program.
When writing a test, express the expected behavior of what is being tested using "should" statements.
Be sure to run the tests to verify that the program works as expected.

If any of these instructions are not clear, please ask for clarification.
