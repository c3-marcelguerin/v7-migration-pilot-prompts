/**
 * C3 Type Relationship Data Gatherer
 * 
 * This snippet should be run in Chrome Developer Tools console
 * in a C3 environment where the C3 type system is available.
 * 
 * Usage:
 * 1. Open Chrome Developer Tools (F12)
 * 2. Navigate to Console tab
 * 3. Paste this entire script and press Enter
 * 4. Call: gatherTypeData('YourRootTypeName')
 * 5. Copy the JSON output to use with the Node.js analyzer
 */

(function() {
    'use strict';

    // Types to ignore during analysis (treated as primitives)
    const IGNORED_TYPES = new Set([
        'AclEntry', 'ActionCondition', 'AdminGroup', 'F', 'Idp', 
        'IdpCertificate', 'Impersonatee', 'MLTrainingJob', 'Meta', 
        'Obj', 'Permission', 'Ref', 'Role', 'T1', 'T2', 'T3', 
        'TypeRef', 'Unit', 'UnitComponent', 'Url', 'User', 'VersionEdit'
    ]);

    /**
     * Extract type relationships from a C3 type
     * @param {string} typeName - The C3 type name to analyze
     * @returns {Object} Object containing type relationships
     */
    function extractTypeRelationships(typeName) {
        try {
            const type = c3Type(typeName);
            const fields = type.fieldTypes();
            const relationships = [];

            for (const field of fields) {
                const valueType = field.valueType();
                
                // Handle reference fields
                if (valueType.isReference()) {
                    const referencedTypeName = valueType.typeName();
                    if (!IGNORED_TYPES.has(referencedTypeName)) {
                        relationships.push({
                            fieldName: field.name(),
                            fieldType: 'reference',
                            referencedType: referencedTypeName
                        });
                    }
                }
                
                // Handle collection fields
                if (valueType.isArray()) {
                    const elementType = valueType.elementType();
                    if (!elementType.isPrimitive()) {
                        const elementTypeName = elementType.typeName();
                        if (!IGNORED_TYPES.has(elementTypeName)) {
                            relationships.push({
                                fieldName: field.name(),
                                fieldType: 'collection',
                                referencedType: elementTypeName
                            });
                        }
                    }
                }
            }

            return {
                typeName: typeName,
                relationships: relationships,
                fieldCount: fields.length
            };
        } catch (error) {
            console.warn(`Error analyzing type ${typeName}:`, error.message);
            return {
                typeName: typeName,
                relationships: [],
                fieldCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Traverse the type system starting from a root type
     * @param {string} rootTypeName - The root type to start traversal from
     * @returns {Object} Complete type relationship data
     */
    function gatherTypeData(rootTypeName) {
        const visited = new Set();
        const typeData = [];
        const edges = [];
        const queue = [rootTypeName];

        console.log(`Starting type analysis from root: ${rootTypeName}`);

        while (queue.length > 0) {
            const currentType = queue.shift();
            
            if (visited.has(currentType) || IGNORED_TYPES.has(currentType)) {
                continue;
            }

            visited.add(currentType);
            console.log(`Analyzing type: ${currentType}`);

            const typeInfo = extractTypeRelationships(currentType);
            typeData.push(typeInfo);

            // Process relationships and add edges
            for (const relationship of typeInfo.relationships) {
                const referencedType = relationship.referencedType;
                
                // Add edge: from dependent type to dependency (currentType depends on referencedType)
                edges.push({
                    from: currentType,
                    to: referencedType,
                    fieldName: relationship.fieldName,
                    fieldType: relationship.fieldType
                });

                // Add referenced type to queue for analysis
                if (!visited.has(referencedType) && !IGNORED_TYPES.has(referencedType)) {
                    queue.push(referencedType);
                }
            }
        }

        const result = {
            rootType: rootTypeName,
            timestamp: new Date().toISOString(),
            typeCount: typeData.length,
            edgeCount: edges.length,
            types: typeData,
            edges: edges,
            ignoredTypes: Array.from(IGNORED_TYPES)
        };

        console.log(`Analysis complete! Found ${typeData.length} types and ${edges.length} relationships.`);
        console.log('Copy the following JSON data for use with the Node.js analyzer:');
        console.log(JSON.stringify(result, null, 2));

        return result;
    }

    // Make function globally available
    window.gatherTypeData = gatherTypeData;
    
    console.log('C3 Type Data Gatherer loaded successfully!');
    console.log('Usage: gatherTypeData("YourRootTypeName")');
})();
