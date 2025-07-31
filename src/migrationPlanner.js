/**
 * Migration Planner API
 * 
 * High-level API for C3 type migration planning and analysis.
 */

const { TypeAnalyzer } = require('./typeAnalyzer');

/**
 * Main Migration Planner class providing high-level API
 */
class MigrationPlanner {
    constructor() {
        this.analyzer = new TypeAnalyzer();
        this.analysisResult = null;
    }

    /**
     * Analyze type relationships starting from a root type
     * @param {string} rootTypeName - The root type to start analysis from
     * @returns {MigrationPlanner} Returns this for method chaining
     */
    analyze(rootTypeName) {
        console.log(`Starting migration analysis from root type: ${rootTypeName}`);
        this.analysisResult = this.analyzer.analyze(rootTypeName);
        console.log(`Analysis complete. Found ${this.analysisResult.stats.totalTypes} types with ${this.analysisResult.stats.totalEdges} dependencies.`);
        
        if (this.analysisResult.cycles.length > 0) {
            console.log(`Warning: Detected and resolved ${this.analysisResult.cycles.length} cycles.`);
        }
        
        return this;
    }

    /**
     * Get types that can be migrated first (starting points)
     * @returns {Array} Array of type names with no dependencies
     */
    getStartingTypes() {
        this._ensureAnalyzed();
        const startingTypes = this.analyzer.getStartingTypes();
        console.log(`Types to start migration with: ${startingTypes.join(', ')}`);
        return startingTypes;
    }

    /**
     * Get all dependencies for a given type
     * @param {string} typeName - The type to get dependencies for
     * @returns {Array} Array of type names that must be migrated before this type
     */
    getDependenciesFor(typeName) {
        this._ensureAnalyzed();
        const dependencies = this.analyzer.getDependencies(typeName);
        console.log(`${typeName} depends on ${dependencies.length} types: ${dependencies.join(', ')}`);
        return dependencies;
    }

    /**
     * Get migration workstreams (connected components)
     * @returns {Object} Object with workstream information
     */
    getWorkstreams() {
        this._ensureAnalyzed();
        const workstreams = this.analyzer.getWorkstreams();
        const result = {
            count: workstreams.length,
            minParallelStreams: 1,
            maxParallelStreams: workstreams.length,
            workstreams: workstreams.map((types, index) => ({
                id: index + 1,
                types: types,
                size: types.length
            }))
        };
        
        console.log(`Migration can be done with ${result.minParallelStreams} to ${result.maxParallelStreams} parallel workstreams.`);
        return result;
    }

    /**
     * Get migration sequence for a specific type
     * @param {string} typeName - The type to get migration sequence for
     * @returns {Array} Array of types in migration order
     */
    getMigrationSequenceFor(typeName) {
        this._ensureAnalyzed();
        const sequence = this.analyzer.getMigrationSequence(typeName);
        console.log(`Migration sequence for ${typeName}: ${sequence.join(' -> ')}`);
        return sequence;
    }

    /**
     * Get complete migration order for all types
     * @returns {Array} Array of all types in migration order
     */
    getCompleteMigrationOrder() {
        this._ensureAnalyzed();
        return this.analysisResult.topologicalSort;
    }

    /**
     * Get complexity analysis
     * @returns {Object} Complexity information grouped by levels
     */
    getComplexityAnalysis() {
        this._ensureAnalyzed();
        const { complexityLevels, stats } = this.analysisResult;
        
        const analysis = {
            S: { types: [], count: stats.complexityCounts.S },
            M: { types: [], count: stats.complexityCounts.M },
            L: { types: [], count: stats.complexityCounts.L }
        };

        for (const [type, level] of Object.entries(complexityLevels)) {
            analysis[level].types.push(type);
        }

        return analysis;
    }

    /**
     * Get detailed analysis report
     * @returns {Object} Comprehensive analysis report
     */
    getAnalysisReport() {
        this._ensureAnalyzed();
        
        const workstreams = this.getWorkstreams();
        const complexity = this.getComplexityAnalysis();
        const startingTypes = this.getStartingTypes();
        
        return {
            summary: {
                totalTypes: this.analysisResult.stats.totalTypes,
                totalDependencies: this.analysisResult.stats.totalEdges,
                cyclesDetected: this.analysisResult.cycles.length,
                workstreamCount: workstreams.count
            },
            migration: {
                startingTypes: startingTypes,
                migrationOrder: this.analysisResult.topologicalSort,
                workstreams: workstreams
            },
            complexity: complexity,
            cycles: this.analysisResult.cycles
        };
    }

    /**
     * Print a formatted migration plan
     */
    printMigrationPlan() {
        this._ensureAnalyzed();
        
        const report = this.getAnalysisReport();
        
        console.log('\n=== MIGRATION ANALYSIS REPORT ===\n');
        
        console.log('SUMMARY:');
        console.log(`  Total Types: ${report.summary.totalTypes}`);
        console.log(`  Total Dependencies: ${report.summary.totalDependencies}`);
        console.log(`  Cycles Detected: ${report.summary.cyclesDetected}`);
        console.log(`  Workstreams: ${report.summary.workstreamCount}`);
        
        console.log('\nSTARTING TYPES (no dependencies):');
        report.migration.startingTypes.forEach(type => {
            console.log(`  - ${type}`);
        });
        
        console.log('\nWORKSTREAMS:');
        report.migration.workstreams.workstreams.forEach(workstream => {
            console.log(`  Workstream ${workstream.id} (${workstream.size} types):`);
            workstream.types.forEach(type => {
                const complexity = Object.entries(report.complexity).find(([_, data]) => 
                    data.types.includes(type)
                )?.[0] || '?';
                console.log(`    - ${type} [${complexity}]`);
            });
        });
        
        console.log('\nCOMPLEXITY DISTRIBUTION:');
        console.log(`  Small (S): ${report.complexity.S.count} types (${Math.round(report.complexity.S.count / report.summary.totalTypes * 100)}%)`);
        console.log(`  Medium (M): ${report.complexity.M.count} types (${Math.round(report.complexity.M.count / report.summary.totalTypes * 100)}%)`);
        console.log(`  Large (L): ${report.complexity.L.count} types (${Math.round(report.complexity.L.count / report.summary.totalTypes * 100)}%)`);
        
        if (report.cycles.length > 0) {
            console.log('\nCYCLES DETECTED AND RESOLVED:');
            report.cycles.forEach((cycle, index) => {
                console.log(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
            });
        }
        
        console.log('\n=== END REPORT ===\n');
    }

    /**
     * Ensure analysis has been performed
     * @private
     */
    _ensureAnalyzed() {
        if (!this.analysisResult) {
            throw new Error('No analysis performed. Call analyze(rootTypeName) first.');
        }
    }
}

module.exports = { MigrationPlanner };
