const fs = require('fs/promises');
const path = require('path');

const MIGRATIONS_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`;

const MIGRATION_ALIASES = {
    '001_create_feature_tables.sql': ['001_create_product_tables.sql', '001_phase2_feature_tables.sql'],
    '002_create_legacy_state_snapshots.sql': ['002_app_state_migration_snapshots.sql']
};

async function runPendingMigrations(pool) {
    await pool.query(MIGRATIONS_TABLE_SQL);

    const migrationsDir = path.join(__dirname, 'migrations');
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true }).catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });

    const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
        .map((entry) => entry.name)
        .sort();

    for (const file of files) {
        const knownIds = [file, ...(MIGRATION_ALIASES[file] || [])];
        const applied = await pool.query(
            'SELECT id FROM schema_migrations WHERE id = ANY($1::text[]) LIMIT 1',
            [knownIds]
        );

        if (applied.rows[0]) {
            if (applied.rows[0].id !== file) {
                await pool.query(
                    'INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
                    [file]
                );
            }
            continue;
        }

        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query(
                'INSERT INTO schema_migrations (id) VALUES ($1)',
                [file]
            );
            await client.query('COMMIT');
            console.log(`Database migration applied: ${file}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = {
    runPendingMigrations
};
