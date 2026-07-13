const LOCAL_DEV_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/decode';

function resolveDatabaseUrl(env = process.env) {
    if (env.DATABASE_URL) return env.DATABASE_URL;

    if (env.NODE_ENV !== 'production') {
        console.warn(
            `[db] DATABASE_URL is not defined; using local development database ${LOCAL_DEV_DATABASE_URL}`
        );
        return LOCAL_DEV_DATABASE_URL;
    }

    throw new Error('DATABASE_URL is not defined');
}

module.exports = {
    LOCAL_DEV_DATABASE_URL,
    resolveDatabaseUrl,
};
