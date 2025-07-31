/**
 * Demo Script for Type Migration Analyzer
 * 
 * This script demonstrates the full functionality using mock C3 types.
 */

// Set up mock C3 types for demonstration
const mockTypes = {
    'ApplicationRoot': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'UserService', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'OrderService', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'UserService': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'User', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => false, isArray: () => true, isPrimitive: () => false, elementType: () => ({ isPrimitive: () => false, typeName: () => 'AuditLog' }) }) }
        ]
    },
    'OrderService': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'Order', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'User', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'Product', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'User': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'Profile', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => false, isArray: () => true, isPrimitive: () => false, elementType: () => ({ isPrimitive: () => false, typeName: () => 'Address' }) }) }
        ]
    },
    'Order': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'Product', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'PaymentMethod', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'Product': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'Category', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'Supplier', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'Profile': { fieldTypes: () => [] },
    'Address': { fieldTypes: () => [] },
    'PaymentMethod': { fieldTypes: () => [] },
    'Category': { fieldTypes: () => [] },
    'Supplier': { fieldTypes: () => [] },
    'AuditLog': { fieldTypes: () => [] }
};

// Mock global c3Type function
global.c3Type = (typeName) => {
    if (mockTypes[typeName]) {
        return mockTypes[typeName];
    }
    throw new Error(`Type ${typeName} not found`);
};

const { MigrationPlanner } = require('./src/migrationPlanner');

console.log('🚀 C3 Type Migration Analyzer Demo\n');

// Analyze from ApplicationRoot as root
console.log('📊 Analyzing migration starting from ApplicationRoot...\n');
const planner = new MigrationPlanner();
planner.analyze('ApplicationRoot');

// Show the comprehensive migration plan
planner.printMigrationPlan();

// Demonstrate specific API calls
console.log('\n🔍 Detailed Analysis:\n');

// Show starting types
const startingTypes = planner.getStartingTypes();
console.log(`✅ Types to migrate first: ${startingTypes.join(', ')}`);

// Show migration sequence for specific types
const criticalTypes = ['UserService', 'OrderService'];
criticalTypes.forEach(type => {
    const sequence = planner.getMigrationSequenceFor(type);
    console.log(`📋 Migration sequence for ${type}: ${sequence.join(' → ')}`);
});

// Show workstreams
const workstreams = planner.getWorkstreams();
console.log(`\n⚡ Parallel workstreams: ${workstreams.count}`);
workstreams.workstreams.forEach((ws, index) => {
    console.log(`   Team ${index + 1}: ${ws.types.join(', ')} (${ws.size} types)`);
});

// Show complexity distribution
const complexity = planner.getComplexityAnalysis();
console.log(`\n📈 Complexity distribution:`);
console.log(`   Small (S): ${complexity.S.count} types - ${complexity.S.types.join(', ')}`);
console.log(`   Medium (M): ${complexity.M.count} types - ${complexity.M.types.join(', ')}`);
console.log(`   Large (L): ${complexity.L.count} types - ${complexity.L.types.join(', ')}`);

console.log('\n✨ Demo completed! Use this tool with real C3 types for actual migration planning.');
