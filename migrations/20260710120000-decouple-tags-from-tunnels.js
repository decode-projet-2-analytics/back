const { DataTypes } = require('sequelize');

/**
 * Align DB with the planned model after a partial earlier refactor:
 * - Tags independent of tunnels (no tunnelId) — already applied in some envs
 * - Tunnel steps stored as ordered tagIds[] on Tunnels (not TunnelSteps table)
 * - Events reference Tag via integer tagId (not tagPublicId UUID)
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function up({ context: queryInterface }) {
    const sequelize = queryInterface.sequelize;
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t));

    // --- Tunnels.tagIds from TunnelSteps ---
    const tunnelCols = await queryInterface.describeTable('Tunnels');
    if (!tunnelCols.tagIds) {
        await queryInterface.addColumn('Tunnels', 'tagIds', {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: false,
            defaultValue: [],
        });
    }

    if (tableNames.includes('TunnelSteps')) {
        await sequelize.query(`
            UPDATE "Tunnels" AS t
            SET "tagIds" = COALESCE((
                SELECT ARRAY_AGG(s."tagId" ORDER BY s."position" ASC, s."id" ASC)
                FROM "TunnelSteps" AS s
                WHERE s."tunnelId" = t.id
            ), '{}'::INTEGER[])
        `);
        await queryInterface.dropTable('TunnelSteps');
    }

    // --- Tags: drop tunnelId if still present ---
    const tagCols = await queryInterface.describeTable('Tags');
    if (tagCols.tunnelId) {
        await queryInterface.removeColumn('Tags', 'tunnelId');
    }

    // --- Events: restore integer tagId from tagPublicId ---
    const eventCols = await queryInterface.describeTable('Events');
    if (!eventCols.tagId) {
        await queryInterface.addColumn('Events', 'tagId', {
            type: DataTypes.INTEGER,
            allowNull: true,
        });

        if (eventCols.tagPublicId) {
            await sequelize.query(`
                UPDATE "Events" AS e
                SET "tagId" = t.id
                FROM "Tags" AS t
                WHERE e."tagPublicId" = t."tagId"
            `);
        }

        // Fallback for any orphan events: attach first tag of the application
        await sequelize.query(`
            UPDATE "Events" AS e
            SET "tagId" = (
                SELECT t.id FROM "Tags" AS t
                WHERE t."applicationId" = e."applicationId"
                ORDER BY t.id ASC
                LIMIT 1
            )
            WHERE e."tagId" IS NULL
        `);

        await sequelize.query(`
            DELETE FROM "Events" WHERE "tagId" IS NULL
        `);

        await queryInterface.changeColumn('Events', 'tagId', {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Tags', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });
    }

    if (eventCols.tagPublicId || (await queryInterface.describeTable('Events')).tagPublicId) {
        await queryInterface.removeColumn('Events', 'tagPublicId');
    }
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    const sequelize = queryInterface.sequelize;
    const tunnelCols = await queryInterface.describeTable('Tunnels');
    const eventCols = await queryInterface.describeTable('Events');
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t));

    if (!tableNames.includes('TunnelSteps') && tunnelCols.tagIds) {
        await queryInterface.createTable('TunnelSteps', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            tunnelId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'Tunnels', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            tagId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'Tags', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            position: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
        });

        await sequelize.query(`
            INSERT INTO "TunnelSteps" ("tunnelId", "tagId", "position", "createdAt", "updatedAt")
            SELECT t.id, unnest(t."tagIds"), generate_subscripts(t."tagIds", 1) - 1, NOW(), NOW()
            FROM "Tunnels" AS t
            WHERE cardinality(t."tagIds") > 0
        `);

        await queryInterface.removeColumn('Tunnels', 'tagIds');
    }

    if (eventCols.tagId && !eventCols.tagPublicId) {
        await queryInterface.addColumn('Events', 'tagPublicId', {
            type: DataTypes.UUID,
            allowNull: true,
        });
        await sequelize.query(`
            UPDATE "Events" AS e
            SET "tagPublicId" = t."tagId"
            FROM "Tags" AS t
            WHERE e."tagId" = t.id
        `);
        await queryInterface.removeColumn('Events', 'tagId');
    }
}

module.exports = { up, down };
