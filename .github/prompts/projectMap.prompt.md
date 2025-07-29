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

Using the information provided above, write a program that analyzes the relationships between C3 types based on their reference and collection fields.

When a type references another type, it creates a directed edge in a graph where the source type is the type that has the reference field and the target type is the type being referenced.
Directed edges are unique in this graph, meaning that if a type A references type B, there will be a single directed edge from A to B, even if there are multiple fields in A that reference B.

This analysis will start with a "root type" and will traverse the C3 type system to find all unique edges in the graph.

The program should not analyze types more than once.

The program should be careful to detect cycles in the graph.

If a cycle is detected, the program should eliminate the edge pointing "to" the type that is closest in depth to the root type.

Using the graph of directed edges, the program should produce a topological sort of the types.

If any of these instructions are not clear, please ask for clarification.
