const { DataTypes } = require('sequelize');

const PROBLEM_TYPES = [
    'DATA_SEEMS_INCORRECT',
    'CANNOT_FIND_INFORMATION',
    'ACCESS_ISSUE',
    'NEED_HELP_INTEGRATION',
    'OTHER',
];

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    await queryInterface.addColumn('Conversations', 'problemType', {
        type: DataTypes.ENUM(...PROBLEM_TYPES),
        allowNull: false,
        defaultValue: 'OTHER',
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.removeColumn('Conversations', 'problemType');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Conversations_problemType";');
}

module.exports = { up, down };
