const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('Tags');

    if (!columns.slug) {
        await queryInterface.addColumn('Tags', 'slug', {
            type: DataTypes.STRING,
            allowNull: true,
        });
    }

    // Migrate former unique "comment" values into slug
    await queryInterface.sequelize.query(`
        UPDATE "Tags"
        SET "slug" = NULLIF(TRIM("comment"), '')
        WHERE "slug" IS NULL
    `);

    await queryInterface.sequelize.query(`
        UPDATE "Tags"
        SET "slug" = 'tag-' || id::text
        WHERE "slug" IS NULL OR TRIM("slug") = ''
    `);

    // Deduplicate slugs within an application
    await queryInterface.sequelize.query(`
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY "applicationId", "slug"
                       ORDER BY id ASC
                   ) AS rn
            FROM "Tags"
            WHERE "deletedAt" IS NULL
        )
        UPDATE "Tags" AS t
        SET "slug" = t."slug" || '-' || ranked.rn::text
        FROM ranked
        WHERE t.id = ranked.id AND ranked.rn > 1
    `);

    await queryInterface.changeColumn('Tags', 'slug', {
        type: DataTypes.STRING,
        allowNull: false,
    });

    try {
        await queryInterface.removeIndex('Tags', 'tags_application_id_comment_unique');
    } catch {
        // index may not exist on fresh DBs
    }

    await queryInterface.changeColumn('Tags', 'comment', {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    });

    // Clear comment after migration so it becomes optional free text
    // (slug already holds the former identifier). Keep existing text as comment.
    // No wipe — comment stays as free text copy of old values; webmaster can edit.

    await queryInterface.addIndex('Tags', ['applicationId', 'slug'], {
        unique: true,
        name: 'tags_application_id_slug_unique',
        where: { deletedAt: null },
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.removeIndex('Tags', 'tags_application_id_slug_unique').catch(() => {});

    await queryInterface.addIndex('Tags', ['applicationId', 'comment'], {
        unique: true,
        name: 'tags_application_id_comment_unique',
        where: { deletedAt: null },
    });

    await queryInterface.removeColumn('Tags', 'slug');
}

module.exports = { up, down };
