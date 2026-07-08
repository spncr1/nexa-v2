if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { pool, ensureDatabaseSchema, formatDbError, testDatabaseConnection } = require('../backend/database/db');
const { runPendingMigrations } = require('../backend/database/migrations');

(async () => {
    await testDatabaseConnection();
    await ensureDatabaseSchema();
    await runPendingMigrations(pool);
    console.log('Database migrations complete.');
})().catch((error) => {
    console.error('Database migration failed:', formatDbError(error));
    process.exitCode = 1;
}).finally(() => {
    pool.end();
});
