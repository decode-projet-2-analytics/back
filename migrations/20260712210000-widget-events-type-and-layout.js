async function up({ context: queryInterface }) {
    await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Widgets_type" ADD VALUE IF NOT EXISTS 'events';`,
    );
}

async function down() {
    // enum value removal not supported; no-op
}

module.exports = { up, down };
