const { Server } = require('socket.io');
const { setIO, getIO } = require('./io');
const { registerChatNamespace } = require('./chat');
const { registerNotificationsNamespace } = require('./notifications');
const { registerAnalyticsNamespace } = require('./analytics');

function initSocket(httpServer, { corsOrigin }) {
    const instance = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            credentials: true,
        },
    });

    setIO(instance);

    registerNotificationsNamespace(instance);
    registerChatNamespace(instance);
    registerAnalyticsNamespace(instance);

    return instance;
}

module.exports = { initSocket, getIO };
