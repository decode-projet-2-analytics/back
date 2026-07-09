/** @type {Map<string, { callId: string, callerId: number, participantIds: Set<number>, status: 'ringing' | 'connecting' | 'active' }>} */
const activeCalls = new Map();

function createCall(conversationId, callId, callerId) {
    if (activeCalls.has(conversationId)) {
        return false;
    }

    activeCalls.set(conversationId, {
        callId,
        callerId,
        participantIds: new Set([callerId]),
        status: 'ringing',
    });

    return true;
}

function getCall(conversationId) {
    return activeCalls.get(conversationId) ?? null;
}

function validateCallId(conversationId, callId) {
    const call = activeCalls.get(conversationId);
    return Boolean(call && call.callId === callId);
}

function addParticipant(conversationId, userId) {
    const call = activeCalls.get(conversationId);
    if (!call) return false;

    call.participantIds.add(userId);
    call.status = 'connecting';
    return true;
}

function setCallActive(conversationId) {
    const call = activeCalls.get(conversationId);
    if (!call) return;

    call.status = 'active';
}

function endCall(conversationId) {
    const call = activeCalls.get(conversationId) ?? null;
    activeCalls.delete(conversationId);
    return call;
}

function endCallsForUser(userId) {
    const ended = [];

    for (const [conversationId, call] of activeCalls.entries()) {
        if (call.participantIds.has(userId)) {
            ended.push({ conversationId, callId: call.callId, call });
            activeCalls.delete(conversationId);
        }
    }

    return ended;
}

function wasAcceptedCall(call) {
    return call && call.status !== 'ringing';
}

module.exports = {
    createCall,
    getCall,
    validateCallId,
    addParticipant,
    setCallActive,
    endCall,
    endCallsForUser,
    wasAcceptedCall,
};
