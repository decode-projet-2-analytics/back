const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const connection = require('./db');

function createMigrator() {
    return new Umzug({
        migrations: {
            glob: path.join(__dirname, '../migrations/*.js'),
            resolve: ({ name, path: migrationPath, context }) => {
                const migration = require(migrationPath);
                return {
                    name,
                    up: async () => migration.up({ context }),
                    down: async () => migration.down({ context }),
                };
            },
        },
        context: connection.getQueryInterface(),
        storage: new SequelizeStorage({
            sequelize: connection,
            tableName: 'SequelizeMeta',
        }),
        logger: console,
    });
}

async function runMigrations(command = 'up') {
    const umzug = createMigrator();

    if (command === 'up') {
        const pending = await umzug.pending();
        const initialPending = pending.find((m) => m.name.includes('initial-schema'));

        if (initialPending) {
            const [tables] = await connection.query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users'",
            );
            if (tables.length > 0) {
                console.log(
                    'Tables Postgres déjà présentes (ancien sync) — enregistrement de la migration initiale sans recréer le schéma',
                );
                await connection.query(
                    'INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT (name) DO NOTHING',
                    { replacements: { name: initialPending.name } },
                );
                return;
            }
        }

        const migrations = await umzug.up();
        if (migrations.length === 0) {
            console.log('Aucune migration en attente');
        } else {
            console.log(`Migrations appliquées : ${migrations.map((m) => m.name).join(', ')}`);
        }
        return;
    }

    if (command === 'down') {
        const migrations = await umzug.down();
        if (migrations.length === 0) {
            console.log('Aucune migration à annuler');
        } else {
            console.log(`Migration annulée : ${migrations.map((m) => m.name).join(', ')}`);
        }
        return;
    }

    if (command === 'status') {
        const executed = await umzug.executed();
        const pending = await umzug.pending();
        console.log('Exécutées :', executed.map((m) => m.name).join(', ') || '(aucune)');
        console.log('En attente :', pending.map((m) => m.name).join(', ') || '(aucune)');
        return;
    }

    throw new Error(`Commande inconnue : ${command} (up | down | status)`);
}

module.exports = { createMigrator, runMigrations };
