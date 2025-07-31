const Database = require('./database');

async function initializeDatabase() {
    console.log('Initializing database...');
    const db = new Database();
    
    try {
        await db.initialize();
        console.log('Database initialized successfully');
        await db.close();
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
