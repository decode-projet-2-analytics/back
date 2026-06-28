const { DataTypes } = require('sequelize');

const WIDGET_CONFIG_DEFAULT = JSON.stringify({
    filters: {},
    timeRange: { from: null, to: null, step: '1h' },
    metric: 'count',
});

/** @param {import('sequelize').QueryInterface} queryInterface */
async function up({ context: queryInterface }) {
    await queryInterface.createTable('Users', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        lastname: { type: DataTypes.STRING, allowNull: true },
        firstname: { type: DataTypes.STRING, allowNull: true },
        birthDate: { type: DataTypes.DATE, allowNull: true },
        role: {
            type: DataTypes.ENUM('Admin', 'Webmaster'),
            allowNull: false,
            defaultValue: 'Webmaster',
        },
        companyName: { type: DataTypes.STRING, allowNull: true },
        kbisDocument: { type: DataTypes.STRING, allowNull: true },
        contactPhone: { type: DataTypes.STRING, allowNull: true },
        websiteUrl: { type: DataTypes.STRING, allowNull: true },
        status: {
            type: DataTypes.ENUM('pending', 'validated', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
        },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('Applications', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        appId: { type: DataTypes.UUID, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        allowedUrls: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
        },
        appSecret: { type: DataTypes.STRING, allowNull: true },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('Tunnels', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        tunnelId: { type: DataTypes.UUID, allowNull: false, unique: true },
        comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
        tagIds: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: false,
            defaultValue: [],
        },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
    });

    await queryInterface.createTable('Tags', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        tagId: { type: DataTypes.UUID, allowNull: false, unique: true },
        comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        tunnelId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Tunnels', key: 'tunnelId' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
    });

    await queryInterface.createTable('Widgets', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('kpi', 'timeseries', 'heatmap'),
            allowNull: false,
        },
        title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        config: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: JSON.parse(WIDGET_CONFIG_DEFAULT),
        },
        position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Widgets', ['applicationId'], { name: 'widgets_application_id' });
    await queryInterface.addIndex('Widgets', ['applicationId', 'position'], {
        name: 'widgets_application_id_position',
    });

    await queryInterface.createTable('Sessions', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        startedAt: { type: DataTypes.DATE, allowNull: false },
        endedAt: { type: DataTypes.DATE, allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        replay: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Sessions', ['applicationId'], { name: 'sessions_application_id' });

    await queryInterface.createTable('Events', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        type: { type: DataTypes.STRING, allowNull: false },
        payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        applicationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Applications', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Sessions', key: 'id' },
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
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Events', ['applicationId'], { name: 'events_application_id' });
    await queryInterface.addIndex('Events', ['sessionId'], { name: 'events_session_id' });
    await queryInterface.addIndex('Events', ['type'], { name: 'events_type' });
}

/** @param {import('sequelize').QueryInterface} queryInterface */
async function down({ context: queryInterface }) {
    await queryInterface.dropTable('Events');
    await queryInterface.dropTable('Sessions');
    await queryInterface.dropTable('Widgets');
    await queryInterface.dropTable('Tags');
    await queryInterface.dropTable('Tunnels');
    await queryInterface.dropTable('Applications');
    await queryInterface.dropTable('Users');
}

module.exports = { up, down };
