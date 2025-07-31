/**
 * Example Usage of the Type Migration Analyzer
 * 
 * This file demonstrates how to use the Migration Planner to analyze
 * C3 type relationships and plan migration sequences.
 */

const { MigrationPlanner } = require('../src/migrationPlanner');

/**
 * Example 1: Basic Migration Analysis
 */
function basicMigrationAnalysis() {
    console.log('=== Example 1: Basic Migration Analysis ===\n');
    
    // Create a new migration planner
    const planner = new MigrationPlanner();
    
    // Analyze starting from a root type (replace 'YourRootType' with actual type)
    // planner.analyze('YourRootType');
    
    // For demonstration, let's use a mock analysis
    console.log('// To perform real analysis, uncomment and replace with actual type:');
    console.log('// planner.analyze("YourRootType");');
    console.log();
    
    // The following would be available after analysis:
    console.log('After analysis, you can:');
    console.log('1. Get starting types: planner.getStartingTypes()');
    console.log('2. Get dependencies: planner.getDependenciesFor("TypeName")');
    console.log('3. Get workstreams: planner.getWorkstreams()');
    console.log('4. Get migration sequence: planner.getMigrationSequenceFor("TypeName")');
    console.log('5. Print full report: planner.printMigrationPlan()');
    console.log();
}

/**
 * Example 2: Step-by-step Migration Planning
 */
function stepByStepMigrationPlanning() {
    console.log('=== Example 2: Step-by-step Migration Planning ===\n');
    
    const planner = new MigrationPlanner();
    
    // Step 1: Analyze the type system
    console.log('Step 1: Analyze type relationships');
    console.log('const planner = new MigrationPlanner();');
    console.log('planner.analyze("RootTypeName");');
    console.log();
    
    // Step 2: Find starting points
    console.log('Step 2: Find types to start migration with');
    console.log('const startingTypes = planner.getStartingTypes();');
    console.log('// Returns types with no dependencies that can be migrated first');
    console.log();
    
    // Step 3: Analyze workstreams
    console.log('Step 3: Determine parallel workstreams');
    console.log('const workstreams = planner.getWorkstreams();');
    console.log('console.log(`Can run ${workstreams.minParallelStreams} to ${workstreams.maxParallelStreams} parallel migrations`);');
    console.log();
    
    // Step 4: Get migration sequence for specific type
    console.log('Step 4: Get migration sequence for a specific type');
    console.log('const sequence = planner.getMigrationSequenceFor("SpecificTypeName");');
    console.log('console.log(`Migration order: ${sequence.join(" -> ")}`);');
    console.log();
    
    // Step 5: Generate full report
    console.log('Step 5: Generate comprehensive migration plan');
    console.log('planner.printMigrationPlan();');
    console.log();
}

/**
 * Example 3: Complex Migration Scenario
 */
function complexMigrationScenario() {
    console.log('=== Example 3: Complex Migration Scenario ===\n');
    
    console.log('// For a complex migration involving multiple teams:');
    console.log();
    
    console.log('const planner = new MigrationPlanner();');
    console.log('planner.analyze("MainApplicationType");');
    console.log();
    
    console.log('// Get complexity analysis for team planning');
    console.log('const complexity = planner.getComplexityAnalysis();');
    console.log('console.log(`Small types (quick wins): ${complexity.S.types.length}`);');
    console.log('console.log(`Medium types (moderate effort): ${complexity.M.types.length}`);');
    console.log('console.log(`Large types (major effort): ${complexity.L.types.length}`);');
    console.log();
    
    console.log('// Assign workstreams to teams');
    console.log('const workstreams = planner.getWorkstreams();');
    console.log('workstreams.workstreams.forEach((ws, index) => {');
    console.log('    console.log(`Team ${index + 1} handles workstream ${ws.id} with ${ws.size} types`);');
    console.log('});');
    console.log();
    
    console.log('// Check dependencies for critical types');
    console.log('const criticalTypes = ["CriticalType1", "CriticalType2"];');
    console.log('criticalTypes.forEach(type => {');
    console.log('    const deps = planner.getDependenciesFor(type);');
    console.log('    console.log(`${type} requires ${deps.length} dependencies to be migrated first`);');
    console.log('});');
    console.log();
}

/**
 * Example 4: API Reference
 */
function apiReference() {
    console.log('=== API Reference ===\n');
    
    console.log('MigrationPlanner Methods:');
    console.log();
    
    console.log('analyze(rootTypeName)');
    console.log('  - Analyzes type relationships starting from root type');
    console.log('  - Returns: MigrationPlanner (for chaining)');
    console.log();
    
    console.log('getStartingTypes()');
    console.log('  - Returns types with no dependencies (migration starting points)');
    console.log('  - Returns: Array<string>');
    console.log();
    
    console.log('getDependenciesFor(typeName)');
    console.log('  - Returns all types that must be migrated before the given type');
    console.log('  - Returns: Array<string>');
    console.log();
    
    console.log('getWorkstreams()');
    console.log('  - Returns connected components (parallel migration streams)');
    console.log('  - Returns: { count, minParallelStreams, maxParallelStreams, workstreams }');
    console.log();
    
    console.log('getMigrationSequenceFor(typeName)');
    console.log('  - Returns migration order for a specific type and its dependencies');
    console.log('  - Returns: Array<string>');
    console.log();
    
    console.log('getCompleteMigrationOrder()');
    console.log('  - Returns complete topological sort of all types');
    console.log('  - Returns: Array<string>');
    console.log();
    
    console.log('getComplexityAnalysis()');
    console.log('  - Returns complexity levels (S, M, L) for all types');
    console.log('  - Returns: { S: {types, count}, M: {types, count}, L: {types, count} }');
    console.log();
    
    console.log('getAnalysisReport()');
    console.log('  - Returns comprehensive analysis report');
    console.log('  - Returns: { summary, migration, complexity, cycles }');
    console.log();
    
    console.log('printMigrationPlan()');
    console.log('  - Prints formatted migration plan to console');
    console.log('  - Returns: void');
    console.log();
}

/**
 * Main function to run all examples
 */
function runExamples() {
    basicMigrationAnalysis();
    stepByStepMigrationPlanning();
    complexMigrationScenario();
    apiReference();
}

// Export functions for testing
module.exports = {
    basicMigrationAnalysis,
    stepByStepMigrationPlanning,
    complexMigrationScenario,
    apiReference,
    runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}
