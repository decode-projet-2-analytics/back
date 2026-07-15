const Message = require('../../../models/message');
const { getIO } = require('../io');
const { authenticateBackofficeSocket } = require('../auth');
const { serializeMessage } = require('./serialize');
const { findAccessibleConversation } = require('./access-conversation');
const {
    buildAdminMessageNotification,
    buildAdminCallNotification,
    publishAdminMessageNotification,
    publishAdminCallNotification,
} = require('../notifications/publish');
const {
    createCall,
    getCall,
    validateCallId,
    addParticipant,
    setCallActive,
    endCall,
    endCallsForUser,
    wasAcceptedCall,
} = require('./call-state');

const CALL_ENDED_MESSAGE = '📞 Un appel visio a eu lieu.';

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
    CALL_INVITE: 'call:invite',
    CALL_INCOMING: 'call:incoming',
    CALL_ACCEPT: 'call:accept',
    CALL_ACCEPTED: 'call:accepted',
    CALL_REJECT: 'call:reject',
    CALL_REJECTED: 'call:rejected',
    CALL_CANCEL: 'call:cancel',
    CALL_CANCELLED: 'call:cancelled',
    CALL_OFFER: 'call:offer',
    CALL_ANSWER: 'call:answer',
    CALL_ICE_CANDIDATE: 'call:ice-candidate',
    CALL_END: 'call:end',
    CALL_ENDED: 'call:ended',
};

const PROTECTED_EVENTS = new Set([
    EVENTS.CONVERSATION_JOIN,
    EVENTS.MESSAGE_SEND,
    EVENTS.CALL_INVITE,
    EVENTS.CALL_ACCEPT,
    EVENTS.CALL_REJECT,
    EVENTS.CALL_CANCEL,
    EVENTS.CALL_OFFER,
    EVENTS.CALL_ANSWER,
    EVENTS.CALL_ICE_CANDIDATE,
    EVENTS.CALL_END,
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

function relayToConversation(socket, conversationId, event, payload) {
    socket.to(conversationRoom(conversationId)).emit(event, payload);
}

async function persistCallEndedMessage(chat, conversation, conversationUuid, senderId, senderFirstname) {
    const message = await Message.create({
        conversationId: conversation.id,
        senderId,
        content: CALL_ENDED_MESSAGE,
    });

    const now = new Date();
    await conversation.update({ lastMessageAt: now, updatedAt: now });

    const payload = serializeMessage(message, conversationUuid);
    payload.senderFirstname = senderFirstname ?? null;

    chat.to(conversationRoom(conversationUuid)).emit(EVENTS.MESSAGE_NEW, payload);
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
            publishAdminMessageNotification(
                getIO(),
                buildAdminMessageNotification(agent, payload),
            );
        });

        socket.on(EVENTS.CALL_INVITE, ({ conversationId, callId, media, conversation }) => {
            if (conversation.status === 'closed') {
                socket.emit(EVENTS.ERROR, { message: 'Conversation is closed' });
                return;
            }

            if (!callId || typeof callId !== 'string') {
                socket.emit(EVENTS.ERROR, { message: 'Invalid call' });
                return;
            }

            const audio = Boolean(media?.audio);
            const video = Boolean(media?.video);

            if (!audio && !video) {
                socket.emit(EVENTS.ERROR, { message: 'At least one media type is required' });
                return;
            }

            if (!createCall(conversationId, callId, agent.userId)) {
                socket.emit(EVENTS.ERROR, { message: 'Call already in progress' });
                return;
            }

            const callPayload = {
                conversationId,
                callId,
                callerId: agent.userId,
                callerFirstname: agent.firstname ?? null,
                media: { audio, video },
            };

            relayToConversation(socket, conversationId, EVENTS.CALL_INCOMING, callPayload);
            publishAdminCallNotification(
                getIO(),
                buildAdminCallNotification(agent, callPayload),
            );
        });

        socket.on(EVENTS.CALL_ACCEPT, ({ conversationId, callId, conversation }) => {
            if (conversation.status === 'closed') {
                socket.emit(EVENTS.ERROR, { message: 'Conversation is closed' });
                return;
            }

            const call = getCall(conversationId);

            if (!validateCallId(conversationId, callId)) {
                socket.emit(EVENTS.ERROR, { message: 'Call not found' });
                return;
            }

            if (call.callerId === agent.userId) {
                socket.emit(EVENTS.ERROR, { message: 'Cannot accept your own call' });
                return;
            }

            addParticipant(conversationId, agent.userId);

            relayToConversation(socket, conversationId, EVENTS.CALL_ACCEPTED, {
                conversationId,
                callId,
                userId: agent.userId,
            });
        });

        socket.on(EVENTS.CALL_REJECT, ({ conversationId, callId }) => {
            if (!validateCallId(conversationId, callId)) return;

            endCall(conversationId);
            relayToConversation(socket, conversationId, EVENTS.CALL_REJECTED, {
                conversationId,
                callId,
                userId: agent.userId,
            });
        });

        socket.on(EVENTS.CALL_CANCEL, ({ conversationId, callId }) => {
            const call = getCall(conversationId);

            if (!call || call.callId !== callId || call.callerId !== agent.userId) {
                return;
            }

            endCall(conversationId);
            relayToConversation(socket, conversationId, EVENTS.CALL_CANCELLED, {
                conversationId,
                callId,
            });
        });

        socket.on(EVENTS.CALL_OFFER, ({ conversationId, callId, sdp }) => {
            if (!validateCallId(conversationId, callId) || !sdp) return;

            relayToConversation(socket, conversationId, EVENTS.CALL_OFFER, {
                conversationId,
                callId,
                sdp,
            });
        });

        socket.on(EVENTS.CALL_ANSWER, ({ conversationId, callId, sdp }) => {
            if (!validateCallId(conversationId, callId) || !sdp) return;

            relayToConversation(socket, conversationId, EVENTS.CALL_ANSWER, {
                conversationId,
                callId,
                sdp,
            });
        });

        socket.on(EVENTS.CALL_ICE_CANDIDATE, ({ conversationId, callId, candidate }) => {
            if (!validateCallId(conversationId, callId) || !candidate) return;

            relayToConversation(socket, conversationId, EVENTS.CALL_ICE_CANDIDATE, {
                conversationId,
                callId,
                candidate,
            });
        });

        socket.on(EVENTS.CALL_END, async ({ conversationId, callId, reason, conversation }) => {
            if (!validateCallId(conversationId, callId)) return;

            const call = endCall(conversationId);

            if (wasAcceptedCall(call)) {
                await persistCallEndedMessage(
                    chat,
                    conversation,
                    conversationId,
                    agent.userId,
                    agent.firstname,
                );
            }

            relayToConversation(socket, conversationId, EVENTS.CALL_ENDED, {
                conversationId,
                callId,
                reason: reason ?? 'hangup',
                userId: agent.userId,
            });
        });

        socket.on('disconnect', async () => {
            const endedCalls = endCallsForUser(agent.userId);

            for (const { conversationId, callId, call } of endedCalls) {
                if (wasAcceptedCall(call)) {
                    const conversation = await findAccessibleConversation(
                        { userId: agent.userId, role: agent.role },
                        conversationId,
                    );

                    if (conversation) {
                        await persistCallEndedMessage(
                            chat,
                            conversation,
                            conversationId,
                            agent.userId,
                            agent.firstname,
                        );
                    }
                }

                chat.to(conversationRoom(conversationId)).emit(EVENTS.CALL_ENDED, {
                    conversationId,
                    callId,
                    reason: 'peer_disconnected',
                    userId: agent.userId,
                });
            }
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
