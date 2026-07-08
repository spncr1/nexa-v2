if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { pool, ensureDatabaseSchema, formatDbError, testDatabaseConnection } = require('../backend/database/db');
const { runPendingMigrations } = require('../backend/database/migrations');
const { importUserAppStateIfNeeded } = require('../backend/services/legacy-state-import');

const force = process.argv.includes('--force') || process.env.FORCE_IMPORT === '1';

(async () => {
    await testDatabaseConnection();
    await ensureDatabaseSchema();
    await runPendingMigrations(pool);

    const users = await pool.query('SELECT id, email FROM users ORDER BY id');
    let imported = 0;
    let skipped = 0;

    for (const user of users.rows) {
        const didImport = await importUserAppStateIfNeeded(user.id, { force });
        if (didImport) {
            imported += 1;
            console.log(`Imported app state for ${user.email}`);
        } else {
            skipped += 1;
        }
    }

    console.log(`Legacy state import complete. Imported: ${imported}. Skipped: ${skipped}.`);
})().catch((error) => {
    console.error('Legacy state import failed:', formatDbError(error));
    process.exitCode = 1;
}).finally(() => {
    pool.end();
});
