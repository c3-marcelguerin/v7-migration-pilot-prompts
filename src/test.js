/**
 * Test suite for the Type Relationship Analyzer
 * 
 * These tests verify the core functionality of the type analyzer
 * using mock C3 type data.
 */

// Mock C3 type system for testing
const mockTypes = new Map();

function setupMockTypes() {
    // Mock type A with reference to B and collection of C
    mockTypes.set('TypeA', {
        fieldTypes: () => [
            {
                valueType: () => ({
                    isReference: () => true,
                    isArray: () => false,
                    typeName: () => 'TypeB'
                })
            },
            {
                valueType: () => ({
                    isReference: () => false,
                    isArray: () => true,
                    elementType: () => ({
                        isPrimitive: () => false,
                        typeName: () => 'TypeC'
                    })
                })
            }
        ]
    });

    // Mock type B with reference to C
    mockTypes.set('TypeB', {
        fieldTypes: () => [
            {
                valueType: () => ({
                    isReference: () => true,
                    isArray: () => false,
                    typeName: () => 'TypeC'
                })
            }
        ]
    });

    // Mock type C with no dependencies (leaf type)
    mockTypes.set('TypeC', {
        fieldTypes: () => []
    });

    // Mock type D with reference to A (creates cycle A->B->C, D->A)
    mockTypes.set('TypeD', {
        fieldTypes: () => [
            {
                valueType: () => ({
                    isReference: () => true,
                    isArray: () => false,
                    typeName: () => 'TypeA'
                })
            }
        ]
    });

    // Mock type E with cycle back to itself
    mockTypes.set('TypeE', {
        fieldTypes: () => [
            {
                valueType: () => ({
                    isReference: () => true,
                    isArray: () => false,
                    typeName: () => 'TypeE'
                })
            }
        ]
    });
}

// Mock c3Type function
global.c3Type = function(typeName) {
    const mockType = mockTypes.get(typeName);
    if (!mockType) {
        throw new Error(`Type ${typeName} not found`);
    }
    return mockType;
};

// Import the analyzer after setting up mocks
const { TypeAnalyzer, analyzeTypeRelationships } = require('./typeAnalyzer');

function testBasicAnalysis() {
    console.log('=== Test: Basic Analysis ===');
    
    const results = analyzeTypeRelationships('TypeA');
    
    console.log('Success:', results.success);
    console.log('Total types:', results.stats.totalTypes);
    console.log('Total edges:', results.stats.totalEdges);
    console.log('Topological order:', results.topologicalOrder);
    console.log('Edges:', results.edges);
    
    // Verify expected results
    const expectedTypes = new Set(['TypeA', 'TypeB', 'TypeC']);
    const actualTypes = new Set(results.topologicalOrder);
    
    console.log('Contains expected types:', 
        [...expectedTypes].every(type => actualTypes.has(type)));
    
    // TypeC should come before TypeB, TypeB should come before TypeA
    const orderCheck = results.topologicalOrder.indexOf('TypeC') < 
                      results.topologicalOrder.indexOf('TypeB') &&
                      results.topologicalOrder.indexOf('TypeB') < 
                      results.topologicalOrder.indexOf('TypeA');
    
    console.log('Correct topological order:', orderCheck);
    console.log('');
}

function testCycleDetection() {
    console.log('=== Test: Cycle Detection and Resolution ===');
    
    // Add a cycle: TypeA -> TypeB -> TypeC, and TypeC -> TypeA
    mockTypes.set('TypeC', {
        fieldTypes: () => [
            {
                valueType: () => ({
                    isReference: () => true,
                    isArray: () => false,
                    typeName: () => 'TypeA'
                })
            }
        ]
    });
    
    const results = analyzeTypeRelationships('TypeA');
    
    console.log('Success with cycle:', results.success);
    console.log('Topological order:', results.topologicalOrder);
    console.log('Edges after cycle resolution:', results.edges);
    
    // Should still produce valid topological sort
    console.log('Valid result despite cycle:', results.success && results.topologicalOrder.length > 0);
    
    // Reset TypeC for other tests
    mockTypes.set('TypeC', {
        fieldTypes: () => []
    });
    
    console.log('');
}

function testSelfReference() {
    console.log('=== Test: Self-Reference ===');
    
    const results = analyzeTypeRelationships('TypeE');
    
    console.log('Success with self-reference:', results.success);
    console.log('Topological order:', results.topologicalOrder);
    console.log('Edges:', results.edges);
    
    // Should handle self-reference gracefully
    console.log('Handles self-reference:', results.success);
    console.log('');
}

function testNonExistentType() {
    console.log('=== Test: Non-existent Type ===');
    
    const results = analyzeTypeRelationships('NonExistentType');
    
    console.log('Success with non-existent type:', results.success);
    console.log('Error message:', results.error);
    
    // Should fail gracefully
    console.log('Fails gracefully:', !results.success && results.error);
    console.log('');
}

function testDirectAnalyzerUsage() {
    console.log('=== Test: Direct TypeAnalyzer Usage ===');
    
    const analyzer = new TypeAnalyzer();
    
    try {
        const topologicalOrder = analyzer.analyzeFromRoot('TypeA');
        const edges = analyzer.getGraphEdges();
        const stats = analyzer.getStats();
        
        console.log('Direct usage successful:', true);
        console.log('Topological order:', topologicalOrder);
        console.log('Edges count:', edges.length);
        console.log('Stats:', stats);
        
    } catch (error) {
        console.log('Direct usage failed:', error.message);
    }
    
    console.log('');
}

function runAllTests() {
    console.log('Starting Type Analyzer Tests...\n');
    
    setupMockTypes();
    
    testBasicAnalysis();
    testCycleDetection();
    testSelfReference();
    testNonExistentType();
    testDirectAnalyzerUsage();
    
    console.log('All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    setupMockTypes,
    testBasicAnalysis,
    testCycleDetection,
    testSelfReference,
    testNonExistentType,
    testDirectAnalyzerUsage
};
