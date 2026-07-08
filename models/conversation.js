const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

const { PROBLEM_TYPES, DEFAULT_PROBLEM_TYPE } = require('../lib/socket/chat/chat-problem-types');

class Conversation extends Model { }

Conversation.init({
    conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    problemType: {
        type: DataTypes.ENUM(...PROBLEM_TYPES),
        allowNull: false,
        defaultValue: DEFAULT_PROBLEM_TYPE,
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
    indexes: [
        { fields: ['applicationId'] },
        { fields: ['status'] },
        { fields: ['updatedAt'] },
    ],
});

module.exports = Conversation;
