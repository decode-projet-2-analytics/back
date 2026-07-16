const { Op } = require('sequelize');
const { EventMirror } = require('../../mongo-models');
const Widget = require('../../../models/widget');
const activeApps = require('./active-apps');
const { mapEventTypeToWidgetTypes } = require('./event-widget-map');
const { createRecalcScheduler } = require('./schedule-widget-recalc');
const { pushWidget } = require('./push');

const WATCH_PIPELINE = [
    { $match: { operationType: { $in: ['insert', 'update', 'replace'] } } },
];
const WATCH_OPTIONS = { fullDocument: 'updateLookup' };
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

let stream = null;
let started = false;
let resumeToken = null;
let backoffMs = BASE_BACKOFF_MS;
let restartTimer = null;

const scheduler = createRecalcScheduler({ delayMs: 2000, push: pushWidget });

async function handleChange(change) {
    resumeToken = change._id ?? resumeToken;

    const doc = change.fullDocument;
    if (!doc || doc.applicationId == null) return;

    const applicationId = Number(doc.applicationId);
    if (!activeApps.has(applicationId)) return;

    const widgetTypes = mapEventTypeToWidgetTypes(doc.type);

    let widgets;
    try {
        widgets = await Widget.findAll({
            where: { applicationId, type: { [Op.in]: widgetTypes } },
        });
    } catch (err) {
        console.error('[analytics] sync_events widget lookup failed', applicationId, err.message);
        return;
    }

    for (const widget of widgets) {
        scheduler.schedule(widget);
    }
}

function scheduleRestart() {
    if (restartTimer) return;
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    console.error(`[analytics] sync_events watch restarting in ${delay}ms`);
    restartTimer = setTimeout(() => {
        restartTimer = null;
        openStream();
    }, delay);
}

function openStream() {
    try {
        const options = { ...WATCH_OPTIONS };
        if (resumeToken) options.resumeAfter = resumeToken;

        stream = EventMirror.watch(WATCH_PIPELINE, options);

        stream.on('change', (change) => {
            handleChange(change).catch((err) => {
                console.error('[analytics] sync_events change handler error', err.message);
            });
        });

        stream.on('error', (err) => {
            console.error('[analytics] sync_events watch error', err.message);
            try { stream.close(); } catch { /* already closing */ }
            stream = null;
            scheduleRestart();
        });

        // Successful (re)open resets backoff.
        backoffMs = BASE_BACKOFF_MS;
        console.log('[analytics] sync_events change stream started');
    } catch (err) {
        console.error('[analytics] sync_events watch open failed', err.message);
        scheduleRestart();
    }
}

function startSyncEventsWatcher() {
    if (started) return;
    started = true;
    openStream();
}

async function stopSyncEventsWatcher() {
    started = false;
    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }
    scheduler.clearAll();
    if (stream) {
        try { await stream.close(); } catch { /* ignore */ }
        stream = null;
    }
}

module.exports = { startSyncEventsWatcher, stopSyncEventsWatcher };
