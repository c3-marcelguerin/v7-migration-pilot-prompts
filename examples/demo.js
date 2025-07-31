#!/usr/bin/env node

/**
 * Demo script to showcase the C3 Type Migration Analyzer
 * This simulates a real-world type hierarchy and demonstrates key features
 */

const TypeAnalysisAPI = require('../src/api');
const path = require('path');

// Sample data representing a realistic C3 type hierarchy
const sampleData = {
    rootType: 'OrderManagement',
    timestamp: new Date().toISOString(),
    typeCount: 12,
    edgeCount: 15,
    types: [
        { typeName: 'User', fieldCount: 8, relationships: [] },
        { typeName: 'Role', fieldCount: 3, relationships: [] },
        { typeName: 'Permission', fieldCount: 4, relationships: [] },
        { typeName: 'UserAccount', fieldCount: 12, relationships: [] },
        { typeName: 'Product', fieldCount: 15, relationships: [] },
        { typeName: 'Category', fieldCount: 6, relationships: [] },
        { typeName: 'Order', fieldCount: 20, relationships: [] },
        { typeName: 'OrderItem', fieldCount: 8, relationships: [] },
        { typeName: 'Payment', fieldCount: 10, relationships: [] },
        { typeName: 'Invoice', fieldCount: 14, relationships: [] },
        { typeName: 'Customer', fieldCount: 18, relationships: [] },
        { typeName: 'OrderManagement', fieldCount: 5, relationships: [] }
    ],
    edges: [
        // User management hierarchy
        { from: 'UserAccount', to: 'User', fieldName: 'user', fieldType: 'reference' },
        { from: 'UserAccount', to: 'Role', fieldName: 'roles', fieldType: 'collection' },
        { from: 'Role', to: 'Permission', fieldName: 'permissions', fieldType: 'collection' },
        
        // Product hierarchy  
        { from: 'Product', to: 'Category', fieldName: 'category', fieldType: 'reference' },
        
        // Order hierarchy
        { from: 'Order', to: 'Customer', fieldName: 'customer', fieldType: 'reference' },
        { from: 'Order', to: 'UserAccount', fieldName: 'createdBy', fieldType: 'reference' },
        { from: 'OrderItem', to: 'Order', fieldName: 'order', fieldType: 'reference' },
        { from: 'OrderItem', to: 'Product', fieldName: 'product', fieldType: 'reference' },
        
        // Payment and invoicing
        { from: 'Payment', to: 'Order', fieldName: 'order', fieldType: 'reference' },
        { from: 'Payment', to: 'Customer', fieldName: 'customer', fieldType: 'reference' },
        { from: 'Invoice', to: 'Order', fieldName: 'order', fieldType: 'reference' },
        { from: 'Invoice', to: 'Payment', fieldName: 'payment', fieldType: 'reference' },
        
        // Customer relationships
        { from: 'Customer', to: 'UserAccount', fieldName: 'account', fieldType: 'reference' },
        
        // Root management type
        { from: 'OrderManagement', to: 'Order', fieldName: 'orders', fieldType: 'collection' },
        { from: 'OrderManagement', to: 'Customer', fieldName: 'customers', fieldType: 'collection' }
    ]
};

async function runDemo() {
    console.log('🚀 Starting C3 Type Migration Analyzer Demo\n');
    
    // Create API instance with custom database path for demo
    const api = new TypeAnalysisAPI();
    api.db.dbPath = path.join(__dirname, '../data/demo.db');
    
    try {
        await api.initialize();
        console.log('✅ API initialized successfully\n');
        
        // Clear any existing data
        await api.db.clearAllData();
        
        // Create analysis session
        console.log('📊 Creating analysis session with sample data...');
        api.analyzer.loadData(sampleData);
        const analysis = api.analyzer.getAnalysis();
        
        // Store in database
        const sessionResult = await api.db.run(
            'INSERT INTO analysis_sessions (root_type, timestamp, type_count, edge_count) VALUES (?, ?, ?, ?)',
            [sampleData.rootType, sampleData.timestamp, sampleData.typeCount, sampleData.edgeCount]
        );
        api.currentSessionId = sessionResult.lastID;
        
        // Store types and analysis results  
        for (const typeInfo of sampleData.types) {
            const complexity = analysis.complexityLevels[typeInfo.typeName];
            await api.db.run(
                'INSERT INTO types (session_id, type_name, field_count, complexity_level) VALUES (?, ?, ?, ?)',
                [api.currentSessionId, typeInfo.typeName, typeInfo.fieldCount, complexity?.complexity || 'S']
            );
        }
        
        console.log('✅ Analysis session created successfully\n');
        
        // Demonstrate key features
        console.log('🎯 MIGRATION PLANNING RESULTS\n');
        
        // 1. Starting types
        const startingTypes = api.analyzer.getStartingTypes();
        console.log('🏁 Starting Types (migrate these first):');
        startingTypes.forEach(type => console.log(`   • ${type}`));
        console.log();
        
        // 2. Topological order
        console.log('📋 Complete Migration Order:');
        analysis.topologicalOrder.forEach((type, index) => {
            const complexity = analysis.complexityLevels[type]?.complexity || 'S';
            console.log(`   ${index + 1}. ${type} (${complexity})`);
        });
        console.log();
        
        // 3. Workstreams
        console.log('👥 Parallel Workstreams:');
        analysis.workstreams.workstreams.forEach((workstream, index) => {
            console.log(`   Team ${index + 1}: ${workstream.join(' → ')}`);
        });
        console.log(`   Max parallel teams: ${analysis.workstreams.maxParallelWorkstreams}\n`);
        
        // 4. Complexity breakdown
        console.log('📊 Complexity Distribution:');
        const complexityGroups = {};
        Object.entries(analysis.complexityLevels).forEach(([type, info]) => {
            if (!complexityGroups[info.complexity]) {
                complexityGroups[info.complexity] = [];
            }
            complexityGroups[info.complexity].push(type);
        });
        
        Object.entries(complexityGroups).forEach(([level, types]) => {
            console.log(`   ${level} (${types.length} types): ${types.join(', ')}`);
        });
        console.log();
        
        // 5. Dependencies for a specific type
        const targetType = 'OrderManagement';
        const dependencies = api.analyzer.getDependencies(targetType);
        console.log(`🔗 Dependencies for ${targetType}:`);
        dependencies.forEach(dep => console.log(`   • ${dep}`));
        console.log();
        
        // 6. Migration sequence for a specific type
        const migrationSequence = [];
        for (const type of analysis.topologicalOrder) {
            if (dependencies.includes(type) || type === targetType) {
                migrationSequence.push(type);
            }
        }
        console.log(`🗂️  Migration Sequence for ${targetType}:`);
        migrationSequence.forEach((type, index) => {
            console.log(`   ${index + 1}. ${type}`);
        });
        console.log();
        
        // 7. Cycle detection results
        if (analysis.cycleBreakingEdges.length > 0) {
            console.log('⚠️  Cycle Breaking Edges:');
            analysis.cycleBreakingEdges.forEach(edge => console.log(`   • ${edge}`));
        } else {
            console.log('✅ No cycles detected - clean dependency graph');
        }
        console.log();
        
        // 8. Summary statistics
        console.log('📈 ANALYSIS SUMMARY\n');
        console.log(`   Root Type: ${analysis.rootType}`);
        console.log(`   Total Types: ${analysis.summary.totalTypes}`);
        console.log(`   Total Relationships: ${analysis.summary.totalEdges}`);
        console.log(`   Starting Types: ${analysis.summary.startingTypes}`);
        console.log(`   Cycle Breaking Edges: ${analysis.summary.cycleBreakingEdges}`);
        console.log(`   Parallel Workstreams: ${analysis.workstreams.maxParallelWorkstreams}`);
        
        // Estimate timeline
        const smallTypes = complexityGroups['S']?.length || 0;
        const mediumTypes = complexityGroups['M']?.length || 0;
        const largeTypes = complexityGroups['L']?.length || 0;
        
        const totalDays = (smallTypes * 2) + (mediumTypes * 4) + (largeTypes * 8);
        const parallelDays = Math.ceil(totalDays / analysis.workstreams.maxParallelWorkstreams);
        
        console.log(`\n⏱️  ESTIMATED TIMELINE\n`);
        console.log(`   Small types (${smallTypes}): ${smallTypes * 2} team-days`);
        console.log(`   Medium types (${mediumTypes}): ${mediumTypes * 4} team-days`);
        console.log(`   Large types (${largeTypes}): ${largeTypes * 8} team-days`);
        console.log(`   Total effort: ${totalDays} team-days`);
        console.log(`   With ${analysis.workstreams.maxParallelWorkstreams} parallel teams: ~${parallelDays} calendar days`);
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Start the API server: npm start');
        console.log('   2. Use the REST endpoints to query this data');
        console.log('   3. Gather real data from your C3 environment');
        console.log('   4. See examples/usage.md for detailed API examples');
        
    } catch (error) {
        console.error('❌ Demo failed:', error);
    } finally {
        await api.stop();
    }
}

// Run demo if executed directly
if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo, sampleData };
