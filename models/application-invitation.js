const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class ApplicationInvitation extends Model { }

ApplicationInvitation.init({
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: 'Email invalid',
        },
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        allowNull: false,
        defaultValue: 'member',
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
    },
    tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    invitedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
});

module.exports = ApplicationInvitation;
