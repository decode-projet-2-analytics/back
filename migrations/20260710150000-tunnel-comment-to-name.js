const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('Tunnels');
    if (columns.comment && !columns.name) {
        await queryInterface.renameColumn('Tunnels', 'comment', 'name');
    }
    await queryInterface.changeColumn('Tunnels', 'name', {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    const columns = await queryInterface.describeTable('Tunnels');
    if (columns.name && !columns.comment) {
        await queryInterface.renameColumn('Tunnels', 'name', 'comment');
    }
    await queryInterface.changeColumn('Tunnels', 'comment', {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    });
}

module.exports = { up, down };
