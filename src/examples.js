/**
 * Example usage of the Type Relationship Analyzer
 * 
 * This file demonstrates how to use the type analyzer to analyze C3 type
 * relationships and produce a topological sort.
 */

// Import the analyzer (assuming it's available in the C3 environment)
// const { analyzeTypeRelationships, printAnalysisResults } = require('./typeAnalyzer');

/**
 * Example: Analyze a specific type and its dependencies
 */
function exampleBasicAnalysis() {
    console.log("=== Basic Type Analysis Example ===");
    
    // Replace 'MyRootType' with an actual C3 type name from your system
    const rootTypeName = 'MyRootType';
    
    const results = analyzeTypeRelationships(rootTypeName);
    printAnalysisResults(results);
}

/**
 * Example: Analyze multiple types and compare their dependency graphs
 */
function exampleCompareTypes() {
    console.log("\n=== Compare Multiple Types Example ===");
    
    const typeNames = ['TypeA', 'TypeB', 'TypeC']; // Replace with actual type names
    
    typeNames.forEach(typeName => {
        console.log(`\n--- Analyzing ${typeName} ---`);
        const results = analyzeTypeRelationships(typeName);
        
        if (results.success) {
            console.log(`Types in dependency graph: ${results.stats.totalTypes}`);
            console.log(`Dependency edges: ${results.stats.totalEdges}`);
            console.log(`Topological order length: ${results.topologicalOrder.length}`);
        } else {
            console.error(`Failed to analyze ${typeName}: ${results.error}`);
        }
    });
}

/**
 * Example: Detailed analysis with custom processing
 */
function exampleDetailedAnalysis() {
    console.log("\n=== Detailed Analysis Example ===");
    
    const rootTypeName = 'ComplexType'; // Replace with actual type name
    const results = analyzeTypeRelationships(rootTypeName);
    
    if (!results.success) {
        console.error(`Analysis failed: ${results.error}`);
        return;
    }
    
    // Find types with the most dependencies
    const dependencyCounts = new Map();
    results.edges.forEach(edge => {
        const count = dependencyCounts.get(edge.source) || 0;
        dependencyCounts.set(edge.source, count + 1);
    });
    
    const sortedByDependencies = Array.from(dependencyCounts.entries())
        .sort((a, b) => b[1] - a[1]);
    
    console.log("\n--- Types with Most Dependencies ---");
    sortedByDependencies.slice(0, 5).forEach(([type, count]) => {
        console.log(`${type}: ${count} dependencies`);
    });
    
    // Find types that are most depended upon
    const dependedUponCounts = new Map();
    results.edges.forEach(edge => {
        const count = dependedUponCounts.get(edge.target) || 0;
        dependedUponCounts.set(edge.target, count + 1);
    });
    
    const sortedByDependedUpon = Array.from(dependedUponCounts.entries())
        .sort((a, b) => b[1] - a[1]);
    
    console.log("\n--- Most Depended Upon Types ---");
    sortedByDependedUpon.slice(0, 5).forEach(([type, count]) => {
        console.log(`${type}: depended upon by ${count} types`);
    });
    
    // Find leaf types (no dependencies)
    const leafTypes = results.topologicalOrder.filter(type => 
        !dependencyCounts.has(type) || dependencyCounts.get(type) === 0
    );
    
    console.log(`\n--- Leaf Types (${leafTypes.length} total) ---`);
    leafTypes.slice(0, 10).forEach(type => {
        console.log(`- ${type}`);
    });
    
    if (leafTypes.length > 10) {
        console.log(`... and ${leafTypes.length - 10} more`);
    }
}

/**
 * Example: Using the TypeAnalyzer class directly for more control
 */
function exampleDirectUsage() {
    console.log("\n=== Direct TypeAnalyzer Usage Example ===");
    
    const { TypeAnalyzer } = require('./typeAnalyzer');
    const analyzer = new TypeAnalyzer();
    
    try {
        const rootTypeName = 'MyType'; // Replace with actual type name
        console.log(`Starting analysis from root type: ${rootTypeName}`);
        
        const topologicalOrder = analyzer.analyzeFromRoot(rootTypeName);
        const edges = analyzer.getGraphEdges();
        const stats = analyzer.getStats();
        
        console.log(`\nAnalysis completed successfully!`);
        console.log(`- ${stats.totalTypes} types in dependency graph`);
        console.log(`- ${stats.totalEdges} dependency relationships`);
        console.log(`- ${stats.analyzedTypes} types fully analyzed`);
        
        console.log(`\nFirst 10 types in topological order:`);
        topologicalOrder.slice(0, 10).forEach((type, index) => {
            console.log(`  ${index + 1}. ${type}`);
        });
        
        if (topologicalOrder.length > 10) {
            console.log(`  ... and ${topologicalOrder.length - 10} more`);
        }
        
    } catch (error) {
        console.error(`Analysis failed: ${error.message}`);
    }
}

/**
 * Helper function to validate that a type exists before analyzing
 */
function safeAnalyzeType(typeName) {
    try {
        // Check if type exists
        const type = c3Type(typeName);
        console.log(`Type '${typeName}' found, starting analysis...`);
        
        const results = analyzeTypeRelationships(typeName);
        return results;
    } catch (error) {
        console.error(`Type '${typeName}' not found or invalid: ${error.message}`);
        return { success: false, error: error.message, rootType: typeName };
    }
}

// Example usage (uncomment and modify for your specific types):

// Run basic analysis
// exampleBasicAnalysis();

// Compare multiple types
// exampleCompareTypes();

// Detailed analysis
// exampleDetailedAnalysis();

// Direct usage
// exampleDirectUsage();

// Safe analysis with validation
// const results = safeAnalyzeType('YourTypeNameHere');
// if (results.success) {
//     printAnalysisResults(results);
// }

console.log("Type analyzer examples loaded. Uncomment and modify the examples above to use with your C3 types.");
