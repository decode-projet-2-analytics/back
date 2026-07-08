const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Message extends Model { }

Message.init({
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
    indexes: [
        { fields: ['conversationId'] },
        { fields: ['createdAt'] },
    ],
});

module.exports = Message;
