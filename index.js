/**
 * Main entry point for the Type Migration Analyzer
 * 
 * This file provides the main exports and a CLI interface for the migration analyzer.
 */

const { TypeAnalyzer } = require('./src/typeAnalyzer');
const { MigrationPlanner } = require('./src/migrationPlanner');

/**
 * Quick start function for common usage
 * @param {string} rootTypeName - The root type to analyze
 * @returns {Object} Analysis results and planner instance
 */
function analyzeMigration(rootTypeName) {
    const planner = new MigrationPlanner();
    planner.analyze(rootTypeName);
    
    return {
        planner,
        report: planner.getAnalysisReport(),
        startingTypes: planner.getStartingTypes(),
        workstreams: planner.getWorkstreams(),
        complexity: planner.getComplexityAnalysis()
    };
}

/**
 * CLI interface for the migration analyzer
 */
function runCLI() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Type Migration Analyzer

Usage:
  node index.js <rootTypeName>                 - Analyze migration for a root type
  node index.js test                          - Run test suite
  node index.js examples                      - Show usage examples

Examples:
  node index.js MyRootType                    - Analyze starting from MyRootType
  node index.js MyRootType --print-plan       - Analyze and print detailed plan
  node index.js MyRootType --get-deps TypeX   - Get dependencies for TypeX
`);
        return;
    }

    const command = args[0];

    if (command === 'test') {
        const { runTests } = require('./test/test');
        runTests();
        return;
    }

    if (command === 'examples') {
        const { runExamples } = require('./examples/usage');
        runExamples();
        return;
    }

    // Analyze a specific type
    const rootTypeName = command;
    const flags = args.slice(1);

    try {
        console.log(`Analyzing migration for root type: ${rootTypeName}\n`);
        
        const planner = new MigrationPlanner();
        planner.analyze(rootTypeName);

        if (flags.includes('--print-plan')) {
            planner.printMigrationPlan();
        } else {
            // Quick summary
            const report = planner.getAnalysisReport();
            console.log('Migration Analysis Summary:');
            console.log(`  Total Types: ${report.summary.totalTypes}`);
            console.log(`  Total Dependencies: ${report.summary.totalDependencies}`);
            console.log(`  Parallel Workstreams: ${report.migration.workstreams.count}`);
            console.log(`  Starting Types: ${report.migration.startingTypes.join(', ')}`);
            console.log('\nUse --print-plan for detailed migration plan.');
        }

        // Handle specific dependency queries
        const getDepIndex = flags.indexOf('--get-deps');
        if (getDepIndex !== -1 && flags[getDepIndex + 1]) {
            const targetType = flags[getDepIndex + 1];
            const deps = planner.getDependenciesFor(targetType);
            console.log(`\nDependencies for ${targetType}:`);
            if (deps.length === 0) {
                console.log('  None (can be migrated first)');
            } else {
                deps.forEach(dep => console.log(`  - ${dep}`));
            }
        }

    } catch (error) {
        console.error(`Error analyzing type ${rootTypeName}: ${error.message}`);
        console.error('Make sure the type exists and is accessible via c3Type() function.');
    }
}

// Export main classes and utilities
module.exports = {
    TypeAnalyzer,
    MigrationPlanner,
    analyzeMigration
};

// Run CLI if this file is executed directly
if (require.main === module) {
    runCLI();
}
