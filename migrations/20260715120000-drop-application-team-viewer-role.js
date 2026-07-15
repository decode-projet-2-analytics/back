async function replaceEnum(sequelize, tableName, enumName, values) {
    const oldEnumName = `${enumName}_old`;
    const enumValues = values.map((value) => `'${value}'`).join(', ');

    await sequelize.query(`ALTER TYPE "${enumName}" RENAME TO "${oldEnumName}";`);
    await sequelize.query(`CREATE TYPE "${enumName}" AS ENUM(${enumValues});`);
    await sequelize.query(`ALTER TABLE "${tableName}" ALTER COLUMN role DROP DEFAULT;`);
    await sequelize.query(
        `ALTER TABLE "${tableName}" ALTER COLUMN role TYPE "${enumName}" USING role::text::"${enumName}";`,
    );
    await sequelize.query(`ALTER TABLE "${tableName}" ALTER COLUMN role SET DEFAULT 'member';`);
    await sequelize.query(`DROP TYPE "${oldEnumName}";`);
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
        const run = (sql) => sequelize.query(sql, { transaction });

        await run(`UPDATE "ApplicationMembers" SET role = 'member' WHERE role = 'viewer';`);
        await run(`ALTER TYPE "enum_ApplicationMembers_role" RENAME TO "enum_ApplicationMembers_role_old";`);
        await run(`CREATE TYPE "enum_ApplicationMembers_role" AS ENUM('admin', 'member');`);
        await run(`ALTER TABLE "ApplicationMembers" ALTER COLUMN role DROP DEFAULT;`);
        await run(`ALTER TABLE "ApplicationMembers" ALTER COLUMN role TYPE "enum_ApplicationMembers_role" USING role::text::"enum_ApplicationMembers_role";`);
        await run(`ALTER TABLE "ApplicationMembers" ALTER COLUMN role SET DEFAULT 'member';`);
        await run(`DROP TYPE "enum_ApplicationMembers_role_old";`);

        await run(`UPDATE "ApplicationInvitations" SET role = 'member' WHERE role = 'viewer';`);
        await run(`ALTER TYPE "enum_ApplicationInvitations_role" RENAME TO "enum_ApplicationInvitations_role_old";`);
        await run(`CREATE TYPE "enum_ApplicationInvitations_role" AS ENUM('admin', 'member');`);
        await run(`ALTER TABLE "ApplicationInvitations" ALTER COLUMN role DROP DEFAULT;`);
        await run(`ALTER TABLE "ApplicationInvitations" ALTER COLUMN role TYPE "enum_ApplicationInvitations_role" USING role::text::"enum_ApplicationInvitations_role";`);
        await run(`ALTER TABLE "ApplicationInvitations" ALTER COLUMN role SET DEFAULT 'member';`);
        await run(`DROP TYPE "enum_ApplicationInvitations_role_old";`);
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
        const originalQuery = sequelize.query.bind(sequelize);
        const transactionalSequelize = {
            query: (sql) => originalQuery(sql, { transaction }),
        };
        await replaceEnum(
            transactionalSequelize,
            'ApplicationMembers',
            'enum_ApplicationMembers_role',
            ['admin', 'member', 'viewer'],
        );
        await replaceEnum(
            transactionalSequelize,
            'ApplicationInvitations',
            'enum_ApplicationInvitations_role',
            ['admin', 'member', 'viewer'],
        );
    });
}

module.exports = { up, down };
