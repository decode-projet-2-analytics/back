function serializeMessage(message, conversationUuid) {
    const json = typeof message.toJSON === 'function' ? message.toJSON() : message;

    return {
        id: json.id,
        conversationId: conversationUuid,
        senderId: json.senderId,
        senderFirstname: json.sender?.firstname ?? json.senderFirstname ?? null,
        content: json.content,
        createdAt: json.createdAt,
    };
}

module.exports = { serializeMessage };
