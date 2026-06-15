const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Event extends Model { }

Event.init({
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    payload: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    tagId: {
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
        { fields: ['sessionId'] },
        { fields: ['type'] },
    ],
});

module.exports = Event;
