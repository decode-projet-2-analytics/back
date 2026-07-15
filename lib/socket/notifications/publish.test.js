const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ADMIN_MESSAGE_NOTIFICATION,
    ADMIN_CALL_NOTIFICATION,
    buildAdminMessageNotification,
    buildAdminCallNotification,
    publishAdminMessageNotification,
    publishAdminCallNotification,
} = require('./publish');

function createFakeIO() {
    const calls = [];
    const namespace = {
        to(room) {
            calls.push({ type: 'to', room });
            return namespace;
        },
        emit(event, payload) {
            calls.push({ type: 'emit', event, payload });
        },
    };

    return {
        calls,
        io: {
            of(name) {
                calls.push({ type: 'of', name });
                return namespace;
            },
        },
    };
}

test('buildAdminMessageNotification builds a trimmed webmaster notification', () => {
    const preview = `  ${'a'.repeat(140)}  `;
    const result = buildAdminMessageNotification(
        { role: 'Webmaster', userId: 12, firstname: 'Lina' },
        { id: 98, conversationId: 'conversation-1', content: preview },
    );

    assert.deepEqual(result, {
        notificationId: 'message:98',
        conversationId: 'conversation-1',
        senderId: 12,
        senderFirstname: 'Lina',
        preview: 'a'.repeat(120),
    });
});

test('buildAdminMessageNotification ignores admin messages', () => {
    assert.equal(buildAdminMessageNotification(
        { role: 'Admin', userId: 1, firstname: 'Ada' },
        { id: 98, conversationId: 'conversation-1', content: 'Bonjour' },
    ), null);
});

test('buildAdminCallNotification builds a webmaster call notification', () => {
    const result = buildAdminCallNotification(
        { role: 'Webmaster', userId: 12, firstname: null },
        {
            conversationId: 'conversation-1',
            callId: 'call-1',
            media: { audio: true, video: false },
        },
    );

    assert.deepEqual(result, {
        notificationId: 'call:call-1',
        conversationId: 'conversation-1',
        callId: 'call-1',
        callerId: 12,
        callerFirstname: null,
        media: { audio: true, video: false },
    });
});

test('buildAdminCallNotification ignores admin calls', () => {
    assert.equal(buildAdminCallNotification(
        { role: 'Admin', userId: 1 },
        { conversationId: 'conversation-1', callId: 'call-1', media: { audio: true } },
    ), null);
});

test('publishers emit only to the admin role room', () => {
    const { io, calls } = createFakeIO();
    const message = { notificationId: 'message:1' };
    const call = { notificationId: 'call:1' };

    publishAdminMessageNotification(io, message);
    publishAdminCallNotification(io, call);

    assert.deepEqual(calls, [
        { type: 'of', name: '/notifications' },
        { type: 'to', room: 'role:Admin' },
        { type: 'emit', event: ADMIN_MESSAGE_NOTIFICATION, payload: message },
        { type: 'of', name: '/notifications' },
        { type: 'to', room: 'role:Admin' },
        { type: 'emit', event: ADMIN_CALL_NOTIFICATION, payload: call },
    ]);
});
