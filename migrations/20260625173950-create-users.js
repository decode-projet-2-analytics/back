module.exports = {
  async up(db) {
    const exists = await db.listCollections({ name: 'users' }).hasNext();
    if (!exists) {
      await db.createCollection('users');
    }

    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: 'users_email_unique' }
    );

    await db.collection('users').createIndex(
      { role: 1, status: 1 },
      { name: 'users_role_status' }
    );
  },

  async down(db) {
    await db.collection('users').dropIndex('users_email_unique');
    await db.collection('users').dropIndex('users_role_status');
  },
};
