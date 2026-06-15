const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Session extends Model { }

Session.init({
    startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    endedAt: DataTypes.DATE,
    metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    replay: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
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
    ],
});

module.exports = Session;
