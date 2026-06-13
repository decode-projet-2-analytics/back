const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Tunnel extends Model { }

// TODO: vérifier ça
Tunnel.init({
    comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
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
