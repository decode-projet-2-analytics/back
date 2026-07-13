// Adds the 'breakdown' and 'scroll_depth' values to the Widget.type enum so
// the new "Breakdown" (top-N) and "Scroll depth" widgets can be created.
//
// The Postgres enum type name follows the Sequelize convention:
//   enum_<TableName>_<column>  ->  enum_Widgets_type
//
// `ADD VALUE IF NOT EXISTS` is idempotent and (Postgres 12+) safe to run
// outside an explicit transaction, which is how Umzug executes migrations here.

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Widgets_type" ADD VALUE IF NOT EXISTS 'breakdown';`,
    );
    await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Widgets_type" ADD VALUE IF NOT EXISTS 'scroll_depth';`,
    );
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down() {
    // Postgres cannot drop a single enum value without recreating the whole
    // type (and rewriting every dependent column). Keeping the extra values is
    // harmless, so the down migration is intentionally a no-op.
}

module.exports = { up, down };
