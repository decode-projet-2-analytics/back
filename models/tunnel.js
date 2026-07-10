const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Tunnel extends Model { }

Tunnel.init({
    tunnelId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    tagIds: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
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
    paranoid: true,
    underscored: false,
});

module.exports = Tunnel;
