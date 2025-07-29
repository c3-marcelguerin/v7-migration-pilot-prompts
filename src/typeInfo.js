function getPropertiesForType(type) {
    const properties = type.fieldTypes();
    const collections = properties.filter(f => f.valueType().isArray());
    const references = properties.filter(f => f.valueType().isReference());
    const functions = properties.filter(f => f.valueType().isMethod());
    const fields = properties.filter(f => f.valueType().isPrimitive());
    return { collections, references, functions, fields };
}

function getTypeStats(typeName) {
    const type = c3Type(typeName);
    const firstDeclaringPackage = type.firstDeclaringPackage();
    const linesOfJsCode = type.sourceCode('JavaScript')?.split(/\n/).length || 0;
    const linesOfPyCode = type.sourceCode('Python')?.split(/\n/).length || 0;
    const properties = type.fieldTypes();
    const collections = properties.filter(f => f.valueType().isArray());
    const references = properties.filter(f => f.valueType().isReference());
    const functions = properties.filter(f => f.valueType().isMethod());
    const fields = properties.filter(f => f.valueType().isPrimitive());
    const calculatedFields = fields.filter(f => f.isCalculated());

    return {
        typeName,
        firstDeclaringPackage,
        linesOfJsCode,
        linesOfPyCode,
        collectionCount: collections.length,
        referenceCount: references.length,
        functionCount: functions.length,
        fieldCount: fields.length,
        calculatedFieldCount: calculatedFields.length,
    };
}

function formatSchemaName(extensions) {
    const schemaName = extensions.schema?.name;
    return schemaName ? ` schema name '${schemaName}'` : "";
}

function formatDbExtensions(extensions) {
    const calc = extensions.db?.calculated;
    const calcText = calc ? ` stored calc '${calc}'` : "";

    const fkey = extensions.db?.fkey;
    const key = extensions.db?.key;
    let fkeyText = "";
    if (fkey && key) {
        fkeyText = ` (${fkey}, ${key})`;
    } else if (fkey) {       
        fkeyText = ` (${fkey})`;
    }

    return `${calcText}${fkeyText}`;
}

function formatElementType(value) {
    let elementType = value.valueType().elementType();
    let elementTypeText;
    if (elementType.isPrimitive()) {
        elementTypeText = elementType.name();
    } else if (elementType.restrictions()) {
        const restrictions = elementType.restrictions();
        const types = restrictions.map(r => r.typeName()).join(/,/);
        elementTypeText = `${elementType.type().typeName()}(${types})`;
    } else {
        elementTypeText = elementType.typeName();
    }
    return elementTypeText;
}

function formatCollectionField(value) {
    const extensions = value.extensions();
    const dbText = formatDbExtensions(extensions);
    const schemaText = formatSchemaName(extensions);

    let elementTypeText = formatElementType(value);

    return `[${elementTypeText}]${dbText}${schemaText}`;
}

function formatReferenceField(value) {
    const extensions = value.extensions();
    const refTypeName = value.valueType().typeName();
    const dbText = formatDbExtensions(extensions);
    const schemaText = formatSchemaName(extensions);
    return `${refTypeName}${dbText}${schemaText}`;
}

function formatPrimitiveField(value) {
    const primitive = value.valueType().name();
    const extensions = value.extensions();
    const dbText = formatDbExtensions(extensions);
    return `${primitive}${dbText}`;
}

function summarizeProperty(property) {
    const typeName = property.parent().typeName();
    const propertyName = property.name();
    const valueType = property.valueType();
    let kind, path = "";
    if (valueType.isArray()) {
        kind = "Array";
        path = formatCollectionField(property);
    } else if (valueType.isMap()) {
        kind = "Map";
    } else if (valueType.isReference()) {
        kind = "Reference";
        path = `${valueType.typeName()}`;
    } else if (valueType.isMethod()) {
        kind = property.isMemberMethod() ? "Member Method" : "Static Method";
    } else if (valueType.isPrimitive()) {
        kind = valueType.name();
    }
    return {
        typeName, propertyName, kind, path,
    }
}

function getPropertiesFromTypeRef(typeRef) {
    const type = c3Type(typeRef.typeName);
    return type.fieldTypes()
        .map(summarizeProperty);
}
