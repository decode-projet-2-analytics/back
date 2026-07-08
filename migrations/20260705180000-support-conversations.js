const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    await queryInterface.createTable('Conversations', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        conversationId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
        },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        status: {
            type: DataTypes.ENUM('open', 'closed'),
            allowNull: false,
            defaultValue: 'open',
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
        lastMessageAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Conversations', ['applicationId'], {
        name: 'conversations_application_id',
    });
    await queryInterface.addIndex('Conversations', ['status'], {
        name: 'conversations_status',
    });
    await queryInterface.addIndex('Conversations', ['updatedAt'], {
        name: 'conversations_updated_at',
    });

    await queryInterface.createTable('Messages', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        conversationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Conversations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        senderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Messages', ['conversationId'], {
        name: 'messages_conversation_id',
    });
    await queryInterface.addIndex('Messages', ['createdAt'], {
        name: 'messages_created_at',
    });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.dropTable('Messages');
    await queryInterface.dropTable('Conversations');
}

module.exports = { up, down };
