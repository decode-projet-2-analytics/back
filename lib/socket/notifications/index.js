const { authenticateBackofficeSocket } = require('../auth');

const EVENTS = {
    READY: 'notifications:ready',
    AVAILABILITY_ADMIN: 'availability:admin',
    AVAILABILITY_USER: 'availability:user',
    AVAILABILITY_USERS: 'availability:users',
};

/** @type {Map<number, { role: string, socketIds: Set<string> }>} */
const connectedUsers = new Map();

function roleRoom(role) {
    return `role:${role}`;
}

function countByRole(role) {
    let count = 0;

    for (const entry of connectedUsers.values()) {
        if (entry.role === role) count += entry.socketIds.size;
    }

    return count;
}

function getOnlineWebmasterIds() {
    const userIds = [];

    for (const [userId, entry] of connectedUsers.entries()) {
        if (entry.role === 'Webmaster' && entry.socketIds.size > 0) {
            userIds.push(userId);
        }
    }

    return userIds;
}

function trackConnection(user, socketId) {
    let entry = connectedUsers.get(user.userId);

    if (!entry) {
        entry = { role: user.role, socketIds: new Set() };
        connectedUsers.set(user.userId, entry);
        entry.socketIds.add(socketId);
        return true;
    }

    const wasEmpty = entry.socketIds.size === 0;
    entry.socketIds.add(socketId);
    return wasEmpty;
}

function untrackConnection(userId, socketId) {
    const entry = connectedUsers.get(userId);

    if (!entry) return false;

    entry.socketIds.delete(socketId);

    if (entry.socketIds.size === 0) {
        connectedUsers.delete(userId);
        return true;
    }

    return false;
}

function registerNotificationsNamespace(io) {
    const notifications = io.of('/notifications');

    notifications.use(authenticateBackofficeSocket);

    notifications.on('connection', (socket) => {
        const agent = socket.data.user;
        const becameOnline = trackConnection(agent, socket.id);

        socket.join(roleRoom(agent.role));

        socket.emit(EVENTS.READY, {
            userId: agent.userId,
            role: agent.role,
        });

        if (agent.role === 'Webmaster') {
            socket.emit(EVENTS.AVAILABILITY_ADMIN, {
                available: countByRole('Admin') > 0,
            });
        } else {
            socket.emit(EVENTS.AVAILABILITY_USERS, {
                userIds: getOnlineWebmasterIds(),
            });
        }

        if (becameOnline) {
            if (agent.role === 'Admin' && countByRole('Admin') === 1) {
                notifications.to(roleRoom('Webmaster')).emit(EVENTS.AVAILABILITY_ADMIN, {
                    available: true,
                });
            }

            if (agent.role === 'Webmaster') {
                notifications.to(roleRoom('Admin')).emit(EVENTS.AVAILABILITY_USER, {
                    userId: agent.userId,
                    available: true,
                });
            }
        }

        socket.on('disconnect', () => {
            const role = agent.role;
            const userId = agent.userId;
            const wentOffline = untrackConnection(userId, socket.id);

            if (!wentOffline) return;

            if (role === 'Admin' && countByRole('Admin') === 0) {
                notifications.to(roleRoom('Webmaster')).emit(EVENTS.AVAILABILITY_ADMIN, {
                    available: false,
                });
            }

            if (role === 'Webmaster') {
                notifications.to(roleRoom('Admin')).emit(EVENTS.AVAILABILITY_USER, {
                    userId,
                    available: false,
                });
            }
        });
    });

    return notifications;
}

module.exports = {
    registerNotificationsNamespace,
    EVENTS,
};
