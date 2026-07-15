const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class ApplicationMember extends Model { }

ApplicationMember.init({
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
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
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
});

module.exports = ApplicationMember;
