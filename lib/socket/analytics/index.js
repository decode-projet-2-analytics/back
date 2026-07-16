const { authenticateBackofficeSocket } = require('../auth');
const { assertApplicationOwnership } = require('../../utils/ownership-scope');
const { appRoom, pushAllWidgetsForApp } = require('./push');
const activeApps = require('./active-apps');

const EVENTS = {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    WIDGET_DATA: 'widget:data',
    WIDGET_REMOVED: 'widget:removed',
    ERROR: 'error',
};

function registerAnalyticsNamespace(io) {
    const analytics = io.of('/analytics');

    analytics.use(authenticateBackofficeSocket);

    analytics.on('connection', (socket) => {
        /** @type {Set<number>} apps this socket is subscribed to */
        const subscribedApps = new Set();

        socket.on(EVENTS.SUBSCRIBE, async (payload = {}, ack) => {
            try {
                const applicationId = Number(payload?.applicationId);
                if (!Number.isFinite(applicationId)) {
                    throw new Error('Invalid applicationId');
                }

                // socket.data.user uses userId; ownership helper expects req.user.id
                const reqLike = {
                    user: {
                        id: socket.data.user.userId,
                        role: socket.data.user.role,
                    },
                };

                await assertApplicationOwnership(reqLike, applicationId);
                socket.join(appRoom(applicationId));

                if (!subscribedApps.has(applicationId)) {
                    subscribedApps.add(applicationId);
                    activeApps.add(applicationId);
                }

                if (typeof ack === 'function') ack({ ok: true });

                // Snapshot after subscribe so a page reload gets fresh live data
                // without waiting for the next ingest debounce.
                pushAllWidgetsForApp(applicationId).catch((err) => {
                    console.error(
                        '[analytics] subscribe push failed',
                        applicationId,
                        err.message,
                    );
                });
            } catch (err) {
                socket.emit(EVENTS.ERROR, { message: err.message || 'subscribe failed' });
                if (typeof ack === 'function') ack({ ok: false });
            }
        });

        socket.on(EVENTS.UNSUBSCRIBE, (payload = {}) => {
            const applicationId = Number(payload?.applicationId);
            if (!Number.isFinite(applicationId)) return;
            socket.leave(appRoom(applicationId));
            if (subscribedApps.delete(applicationId)) {
                activeApps.remove(applicationId);
            }
        });

        socket.on('disconnect', () => {
            for (const applicationId of subscribedApps) {
                activeApps.remove(applicationId);
            }
            subscribedApps.clear();
        });
    });

    return analytics;
}

module.exports = { registerAnalyticsNamespace, EVENTS };
