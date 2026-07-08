const Application = require('../../../models/application');
const Conversation = require('../../../models/conversation');

function getUserId(user) {
    return user.id ?? user.userId;
}

async function findAccessibleConversation(user, conversationUuid) {
    const conversation = await Conversation.findOne({
        where: { conversationId: conversationUuid },
    });

    if (!conversation) return null;

    if (user.role === 'Admin') return conversation;

    const application = await Application.findOne({
        where: {
            id: conversation.applicationId,
            ownerId: getUserId(user),
        },
    });

    if (!application) return null;

    return conversation;
}

async function loadConversation(req, res, next) {
    try {
        const conversation = await findAccessibleConversation(
            req.user,
            req.params.conversationId,
        );

        if (!conversation) {
            return res.sendStatus(404);
        }

        req.conversation = conversation;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    findAccessibleConversation,
    loadConversation,
};
