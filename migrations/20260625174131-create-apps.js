module.exports = {
  async up(db) {
    const exists = await db.listCollections({ name: 'apps' }).hasNext();
    if (!exists) {
      await db.createCollection('apps');
    }

    await db.collection('apps').createIndex(
      { appId: 1 },
      { unique: true, name: 'apps_appId_unique' }
    );

    await db.collection('apps').createIndex(
      { ownerId: 1 },
      { name: 'apps_ownerId' }
    );
  },

  async down(db) {
    await db.collection('apps').dropIndex('apps_appId_unique');
    await db.collection('apps').dropIndex('apps_ownerId');
  },
};
