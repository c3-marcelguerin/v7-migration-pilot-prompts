const TypeAnalysisAPI = require('./api');

const api = new TypeAnalysisAPI();
const port = process.env.PORT || 3000;

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await api.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await api.stop();
    process.exit(0);
});

// Start server
api.start(port).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
