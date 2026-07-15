const ADMIN_MESSAGE_NOTIFICATION = 'notification:message';
const ADMIN_CALL_NOTIFICATION = 'notification:call';
const ADMIN_ROOM = 'role:Admin';
const MESSAGE_PREVIEW_LENGTH = 120;

function isWebmaster(agent) {
    return agent?.role === 'Webmaster';
}

function buildAdminMessageNotification(agent, message) {
    if (!isWebmaster(agent)) return null;

    return {
        notificationId: `message:${message.id}`,
        conversationId: message.conversationId,
        senderId: agent.userId,
        senderFirstname: agent.firstname ?? null,
        preview: message.content.trim().slice(0, MESSAGE_PREVIEW_LENGTH),
    };
}

function buildAdminCallNotification(agent, call) {
    if (!isWebmaster(agent)) return null;

    return {
        notificationId: `call:${call.callId}`,
        conversationId: call.conversationId,
        callId: call.callId,
        callerId: agent.userId,
        callerFirstname: agent.firstname ?? null,
        media: {
            audio: Boolean(call.media?.audio),
            video: Boolean(call.media?.video),
        },
    };
}

function publishAdminNotification(io, event, payload) {
    if (!payload) return;
    io.of('/notifications').to(ADMIN_ROOM).emit(event, payload);
}

function publishAdminMessageNotification(io, payload) {
    publishAdminNotification(io, ADMIN_MESSAGE_NOTIFICATION, payload);
}

function publishAdminCallNotification(io, payload) {
    publishAdminNotification(io, ADMIN_CALL_NOTIFICATION, payload);
}

module.exports = {
    ADMIN_MESSAGE_NOTIFICATION,
    ADMIN_CALL_NOTIFICATION,
    buildAdminMessageNotification,
    buildAdminCallNotification,
    publishAdminMessageNotification,
    publishAdminCallNotification,
};
