require('dotenv').config();

const url = process.env.MONGO_URL;
if (!url) {
  throw new Error('MONGO_URL is not defined');
}

module.exports = {
  mongodb: {
    url,
    databaseName: 'decode',
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};
