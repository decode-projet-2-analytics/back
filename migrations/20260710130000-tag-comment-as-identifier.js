const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('Tags');
    if (columns.tagId) {
        await queryInterface.removeColumn('Tags', 'tagId');
    }

    // Deduplicate comments within an application before unique index
    await queryInterface.sequelize.query(`
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY "applicationId", "comment"
                       ORDER BY id ASC
                   ) AS rn
            FROM "Tags"
            WHERE "deletedAt" IS NULL
        )
        UPDATE "Tags" AS t
        SET "comment" = t."comment" || '-' || ranked.rn::text
        FROM ranked
        WHERE t.id = ranked.id AND ranked.rn > 1
    `);

    await queryInterface.addIndex('Tags', ['applicationId', 'comment'], {
        unique: true,
        name: 'tags_application_id_comment_unique',
        where: { deletedAt: null },
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.removeIndex('Tags', 'tags_application_id_comment_unique');

    const columns = await queryInterface.describeTable('Tags');
    if (!columns.tagId) {
        await queryInterface.addColumn('Tags', 'tagId', {
            type: DataTypes.UUID,
            allowNull: true,
            unique: true,
        });
        await queryInterface.sequelize.query(`
            UPDATE "Tags" SET "tagId" = gen_random_uuid() WHERE "tagId" IS NULL
        `);
        await queryInterface.changeColumn('Tags', 'tagId', {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
        });
    }
}

module.exports = { up, down };
