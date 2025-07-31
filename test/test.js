/**
 * Test Suite for Type Migration Analyzer
 * 
 * Tests cover the functionality of TypeAnalyzer and MigrationPlanner classes.
 * Uses a mock C3 type system for testing.
 */

// Mock C3 type system for testing
const mockTypes = {
    'TypeA': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'TypeB', isArray: () => false, isPrimitive: () => false }) },
            { valueType: () => ({ isReference: () => true, typeName: () => 'TypeC', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'TypeB': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => false, isArray: () => true, isPrimitive: () => false, elementType: () => ({ isPrimitive: () => false, typeName: () => 'TypeD' }) }) }
        ]
    },
    'TypeC': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'TypeD', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'TypeD': {
        fieldTypes: () => []
    },
    'CyclicA': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'CyclicB', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'CyclicB': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'CyclicC', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'CyclicC': {
        fieldTypes: () => [
            { valueType: () => ({ isReference: () => true, typeName: () => 'CyclicA', isArray: () => false, isPrimitive: () => false }) }
        ]
    },
    'IsolatedType': {
        fieldTypes: () => []
    }
};

// Mock global c3Type function
global.c3Type = (typeName) => {
    if (mockTypes[typeName]) {
        return mockTypes[typeName];
    }
    throw new Error(`Type ${typeName} not found`);
};

const { TypeAnalyzer } = require('../src/typeAnalyzer');
const { MigrationPlanner } = require('../src/migrationPlanner');

/**
 * Test runner and assertion utilities
 */
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, testFn) {
        this.tests.push({ description, testFn });
    }

    async run() {
        console.log('Running tests...\n');
        
        for (const { description, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✓ ${description}`);
                this.passed++;
            } catch (error) {
                console.log(`✗ ${description}`);
                console.log(`  Error: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertArrayEqual(actual, expected, message) {
        if (JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())) {
            throw new Error(message || `Expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
        }
    }

    assertArrayContains(array, item, message) {
        if (!array.includes(item)) {
            throw new Error(message || `Expected array to contain ${item}`);
        }
    }
}

/**
 * Test suite for TypeAnalyzer
 */
function createTypeAnalyzerTests(runner) {
    runner.test('TypeAnalyzer should initialize with empty state', () => {
        const analyzer = new TypeAnalyzer();
        runner.assertEqual(analyzer.visitedTypes.size, 0, 'Should have no visited types initially');
        runner.assertEqual(analyzer.edges.size, 0, 'Should have no edges initially');
    });

    runner.test('TypeAnalyzer should build simple dependency graph', () => {
        const analyzer = new TypeAnalyzer();
        const result = analyzer.analyze('TypeA');
        
        runner.assert(result.edges.length > 0, 'Should have edges in the graph');
        runner.assert(result.stats.totalTypes > 0, 'Should have analyzed types');
        
        // TypeA should depend on TypeB and TypeC
        const typeAEdges = result.edges.filter(edge => edge.from === 'TypeA');
        const dependencies = typeAEdges.map(edge => edge.to);
        runner.assertArrayContains(dependencies, 'TypeB', 'TypeA should depend on TypeB');
        runner.assertArrayContains(dependencies, 'TypeC', 'TypeA should depend on TypeC');
    });

    runner.test('TypeAnalyzer should handle array fields correctly', () => {
        const analyzer = new TypeAnalyzer();
        const result = analyzer.analyze('TypeB');
        
        // TypeB should depend on TypeD through array field
        const typeBEdges = result.edges.filter(edge => edge.from === 'TypeB');
        const dependencies = typeBEdges.map(edge => edge.to);
        runner.assertArrayContains(dependencies, 'TypeD', 'TypeB should depend on TypeD through array field');
    });

    runner.test('TypeAnalyzer should detect and resolve cycles', () => {
        const analyzer = new TypeAnalyzer();
        const result = analyzer.analyze('CyclicA');
        
        runner.assert(result.cycles.length > 0, 'Should detect cycles in cyclic graph');
        
        // After cycle resolution, should still have a valid topological sort
        runner.assert(result.topologicalSort.length > 0, 'Should produce topological sort after cycle resolution');
    });

    runner.test('TypeAnalyzer should calculate complexity levels correctly', () => {
        const analyzer = new TypeAnalyzer();
        const result = analyzer.analyze('TypeA');
        
        runner.assert(result.complexityLevels, 'Should have complexity levels');
        
        const levels = Object.values(result.complexityLevels);
        const hasS = levels.includes('S');
        const hasM = levels.includes('M');
        const hasL = levels.includes('L');
        
        // Should have at least some complexity assignments
        runner.assert(hasS || hasM || hasL, 'Should assign complexity levels');
    });

    runner.test('TypeAnalyzer should ignore specified types', () => {
        const analyzer = new TypeAnalyzer();
        
        // Add a mock type that references an ignored type
        mockTypes['TestType'] = {
            fieldTypes: () => [
                { valueType: () => ({ isReference: () => true, typeName: () => 'Obj', isArray: () => false, isPrimitive: () => false }) }
            ]
        };
        
        const result = analyzer.analyze('TestType');
        
        // Should not have edges to ignored types
        const objEdges = result.edges.filter(edge => edge.to === 'Obj');
        runner.assertEqual(objEdges.length, 0, 'Should ignore specified types like Obj');
    });

    runner.test('TypeAnalyzer should produce valid topological sort', () => {
        const analyzer = new TypeAnalyzer();
        const result = analyzer.analyze('TypeA');
        
        runner.assert(result.topologicalSort.length > 0, 'Should produce non-empty topological sort');
        
        // Verify that dependencies come before dependents
        const sortOrder = result.topologicalSort;
        const positionMap = new Map();
        sortOrder.forEach((type, index) => positionMap.set(type, index));
        
        for (const edge of result.edges) {
            const fromPos = positionMap.get(edge.from);
            const toPos = positionMap.get(edge.to);
            
            if (fromPos !== undefined && toPos !== undefined) {
                runner.assert(toPos < fromPos, `Dependency ${edge.to} should come before ${edge.from} in topological sort`);
            }
        }
    });
}

/**
 * Test suite for MigrationPlanner
 */
function createMigrationPlannerTests(runner) {
    runner.test('MigrationPlanner should require analysis before use', () => {
        const planner = new MigrationPlanner();
        
        try {
            planner.getStartingTypes();
            runner.assert(false, 'Should throw error when used before analysis');
        } catch (error) {
            runner.assert(error.message.includes('No analysis performed'), 'Should throw appropriate error message');
        }
    });

    runner.test('MigrationPlanner should support method chaining', () => {
        const planner = new MigrationPlanner();
        const result = planner.analyze('TypeA');
        
        runner.assertEqual(result, planner, 'analyze() should return the planner instance for chaining');
    });

    runner.test('MigrationPlanner should identify starting types correctly', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const startingTypes = planner.getStartingTypes();
        
        runner.assert(Array.isArray(startingTypes), 'Should return array of starting types');
        runner.assertArrayContains(startingTypes, 'TypeD', 'TypeD should be a starting type (no dependencies)');
    });

    runner.test('MigrationPlanner should calculate dependencies correctly', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const depsForA = planner.getDependenciesFor('TypeA');
        
        runner.assert(Array.isArray(depsForA), 'Should return array of dependencies');
        runner.assert(depsForA.length > 0, 'TypeA should have dependencies');
    });

    runner.test('MigrationPlanner should identify workstreams', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const workstreams = planner.getWorkstreams();
        
        runner.assert(workstreams.count >= 1, 'Should have at least one workstream');
        runner.assert(workstreams.minParallelStreams >= 1, 'Should have valid minimum parallel streams');
        runner.assert(workstreams.maxParallelStreams >= workstreams.minParallelStreams, 'Max should be >= min parallel streams');
        runner.assert(Array.isArray(workstreams.workstreams), 'Should have workstreams array');
    });

    runner.test('MigrationPlanner should generate migration sequence', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const sequence = planner.getMigrationSequenceFor('TypeA');
        
        runner.assert(Array.isArray(sequence), 'Should return array for migration sequence');
        runner.assertArrayContains(sequence, 'TypeA', 'Sequence should include the requested type');
    });

    runner.test('MigrationPlanner should provide complexity analysis', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const complexity = planner.getComplexityAnalysis();
        
        runner.assert(complexity.S, 'Should have S complexity category');
        runner.assert(complexity.M, 'Should have M complexity category');
        runner.assert(complexity.L, 'Should have L complexity category');
        
        runner.assert(Array.isArray(complexity.S.types), 'S category should have types array');
        runner.assert(typeof complexity.S.count === 'number', 'S category should have count');
    });

    runner.test('MigrationPlanner should generate comprehensive report', () => {
        const planner = new MigrationPlanner();
        planner.analyze('TypeA');
        
        const report = planner.getAnalysisReport();
        
        runner.assert(report.summary, 'Report should have summary section');
        runner.assert(report.migration, 'Report should have migration section');
        runner.assert(report.complexity, 'Report should have complexity section');
        runner.assert(Array.isArray(report.cycles), 'Report should have cycles array');
        
        runner.assert(typeof report.summary.totalTypes === 'number', 'Summary should have total types count');
        runner.assert(Array.isArray(report.migration.startingTypes), 'Migration should have starting types');
    });
}

/**
 * Integration tests
 */
function createIntegrationTests(runner) {
    runner.test('Complete workflow should work end-to-end', () => {
        const planner = new MigrationPlanner();
        
        // Analyze
        planner.analyze('TypeA');
        
        // Get starting types
        const startingTypes = planner.getStartingTypes();
        runner.assert(startingTypes.length > 0, 'Should find starting types');
        
        // Get workstreams
        const workstreams = planner.getWorkstreams();
        runner.assert(workstreams.count > 0, 'Should identify workstreams');
        
        // Get dependencies for each type
        const allTypes = planner.getCompleteMigrationOrder();
        for (const type of allTypes) {
            const deps = planner.getDependenciesFor(type);
            runner.assert(Array.isArray(deps), `Should get dependencies for ${type}`);
        }
        
        // Generate report
        const report = planner.getAnalysisReport();
        runner.assert(report.summary.totalTypes > 0, 'Report should show analyzed types');
    });

    runner.test('Isolated types should be handled correctly', () => {
        const planner = new MigrationPlanner();
        planner.analyze('IsolatedType');
        
        const startingTypes = planner.getStartingTypes();
        runner.assertArrayContains(startingTypes, 'IsolatedType', 'Isolated type should be a starting type');
        
        const deps = planner.getDependenciesFor('IsolatedType');
        runner.assertEqual(deps.length, 0, 'Isolated type should have no dependencies');
    });
}

/**
 * Main test function
 */
async function runTests() {
    const runner = new TestRunner();
    
    console.log('Setting up Type Migration Analyzer Tests\n');
    
    // Create test suites
    createTypeAnalyzerTests(runner);
    createMigrationPlannerTests(runner);
    createIntegrationTests(runner);
    
    // Run all tests
    const success = await runner.run();
    
    if (success) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n❌ Some tests failed. Please review the errors above.');
    }
    
    return success;
}

// Export for use in other files
module.exports = { runTests, TestRunner };

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}
