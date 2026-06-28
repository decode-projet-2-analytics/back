const connection = require('./lib/db');
const { runMigrations } = require('./lib/migrations');

const command = process.argv[2] ?? 'up';

runMigrations(command)
    .then(() => connection.close())
    .catch((error) => {
        console.error(error);
        connection.close().finally(() => process.exit(1));
    });
