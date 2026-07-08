const Message = require('../../../models/message');
const { getIO } = require('../io');
const { authenticateBackofficeSocket } = require('../auth');
const { serializeMessage } = require('./serialize');
const { findAccessibleConversation } = require('./access-conversation');

const EVENTS = {
    READY: 'chat:ready',
    ERROR: 'chat:error',
    CONVERSATION_JOIN: 'conversation:join',
    CONVERSATION_LEAVE: 'conversation:leave',
    CONVERSATION_STATUS: 'conversation:status',
    MESSAGE_SEND: 'message:send',
    MESSAGE_NEW: 'message:new',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
};

const PROTECTED_EVENTS = new Set([
    EVENTS.CONVERSATION_JOIN,
    EVENTS.MESSAGE_SEND,
]);

function conversationRoom(conversationUuid) {
    return `conversation:${conversationUuid}`;
}

function emitConversationStatus(conversationUuid, status) {
    getIO()
        .of('/chat')
        .to(conversationRoom(conversationUuid))
        .emit(EVENTS.CONVERSATION_STATUS, {
            conversationId: conversationUuid,
            status,
        });
}

function registerChatNamespace(io) {
    const chat = io.of('/chat');

    chat.use(authenticateBackofficeSocket);

    chat.on('connection', (socket) => {
        const agent = socket.data.user;

        socket.use(async ([event, payload], next) => {
            if (!PROTECTED_EVENTS.has(event)) {
                return next();
            }

            const conversationId = payload?.conversationId;

            if (!conversationId || typeof conversationId !== 'string') {
                socket.emit(EVENTS.ERROR, { message: 'Invalid conversation' });
                return;
            }

            const conversation = await findAccessibleConversation(agent, conversationId);

            if (!conversation) {
                socket.emit(EVENTS.ERROR, { message: 'Conversation not found' });
                return;
            }

            payload.conversation = conversation;
            return next();
        });

        socket.emit(EVENTS.READY, {
            userId: agent.userId,
            role: agent.role,
            email: agent.email,
            firstname: agent.firstname,
        });

        socket.on(EVENTS.CONVERSATION_JOIN, ({ conversationId }) => {
            socket.join(conversationRoom(conversationId));
        });

        socket.on(EVENTS.CONVERSATION_LEAVE, ({ conversationId }) => {
            if (!conversationId || typeof conversationId !== 'string') return;
            socket.leave(conversationRoom(conversationId));
        });

        socket.on(EVENTS.TYPING_START, ({ conversationId }) => {
            if (!conversationId) return;
            socket.to(conversationRoom(conversationId)).emit(EVENTS.TYPING_START, {
                conversationId,
                userId: agent.userId,
            });
        });

        socket.on(EVENTS.TYPING_STOP, ({ conversationId }) => {
            if (!conversationId) return;
            socket.to(conversationRoom(conversationId)).emit(EVENTS.TYPING_STOP, {
                conversationId,
                userId: agent.userId,
            });
        });

        socket.on(EVENTS.MESSAGE_SEND, async ({ conversationId, content, conversation }) => {
            if (typeof content !== 'string' || !content.trim()) return;

            if (conversation.status === 'closed') {
                socket.emit(EVENTS.ERROR, { message: 'Conversation is closed' });
                return;
            }

            const message = await Message.create({
                conversationId: conversation.id,
                senderId: agent.userId,
                content: content.trim(),
            });

            const now = new Date();
            await conversation.update({ lastMessageAt: now, updatedAt: now });

            const payload = serializeMessage(message, conversationId);
            payload.senderFirstname = agent.firstname ?? null;

            chat.to(conversationRoom(conversationId)).emit(EVENTS.MESSAGE_NEW, payload);
        });
    });

    return chat;
}

module.exports = {
    registerChatNamespace,
    emitConversationStatus,
    conversationRoom,
    EVENTS,
};
