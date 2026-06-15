const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

const WIDGET_TYPES = ['kpi', 'timeseries', 'heatmap'];
const WIDGET_METRICS = ['count', 'rate'];

const defaultConfig = {
    filters: {},
    timeRange: {
        from: null,
        to: null,
        step: '1h',
    },
    metric: 'count',
};

class Widget extends Model { }

Widget.init({
    type: {
        type: DataTypes.ENUM(...WIDGET_TYPES),
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    config: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: defaultConfig,
        validate: {
            isValidConfig(value) {
                if (!value || typeof value !== 'object') {
                    throw new Error('config must be an object');
                }
                if (value.metric && !WIDGET_METRICS.includes(value.metric)) {
                    throw new Error(`config.metric must be one of: ${WIDGET_METRICS.join(', ')}`);
                }
            },
        },
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
    indexes: [
        { fields: ['applicationId'] },
        { fields: ['applicationId', 'position'] },
    ],
});

module.exports = Widget;
