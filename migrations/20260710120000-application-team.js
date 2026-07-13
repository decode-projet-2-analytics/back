const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    await queryInterface.createTable('ApplicationMembers', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        role: {
            type: DataTypes.ENUM('admin', 'member', 'viewer'),
            allowNull: false,
            defaultValue: 'member',
        },
        status: {
            type: DataTypes.ENUM('active', 'revoked'),
            allowNull: false,
            defaultValue: 'active',
        },
        invitedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ApplicationMembers', ['applicationId', 'userId'], {
        unique: true,
        name: 'application_members_application_user_unique',
    });
    await queryInterface.addIndex('ApplicationMembers', ['userId', 'status'], {
        name: 'application_members_user_status',
    });

    await queryInterface.createTable('ApplicationInvitations', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        email: { type: DataTypes.STRING, allowNull: false },
        role: {
            type: DataTypes.ENUM('admin', 'member', 'viewer'),
            allowNull: false,
            defaultValue: 'member',
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'revoked', 'expired'),
            allowNull: false,
            defaultValue: 'pending',
        },
        tokenHash: { type: DataTypes.STRING, allowNull: false },
        invitedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        acceptedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ApplicationInvitations', ['applicationId', 'email', 'status'], {
        name: 'application_invitations_application_email_status',
    });
    await queryInterface.addIndex('ApplicationInvitations', ['tokenHash'], {
        unique: true,
        name: 'application_invitations_token_hash_unique',
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.dropTable('ApplicationInvitations');
    await queryInterface.dropTable('ApplicationMembers');
}

module.exports = { up, down };
