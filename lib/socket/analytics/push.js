const Widget = require('../../../models/widget');
const { getIO } = require('../io');
const { aggregateFunnel } = require('../../aggregations/funnel');
const { aggregateEventsKpi } = require('../../aggregations/events-kpi');
const { aggregateEventsTimeseries } = require('../../aggregations/events-timeseries');
const { getTrackedPages, getMouseMovements } = require('../../aggregations/mouse-heatmap');

const DEBOUNCE_MS = 2000;
/** @type {Map<number, NodeJS.Timeout>} */
const timers = new Map();

function appRoom(applicationId) {
    return `app:${applicationId}`;
}

async function computeWidgetPayload(widget) {
    switch (widget.type) {
        case 'funnel':
            return aggregateFunnel(widget);
        case 'events': {
            const viz = widget.config?.visualization || 'nombre';
            if (
                viz === 'line'
                || viz === 'timeseries'
                || viz === 'activity'
                || viz === 'heatmap'
            ) {
                return aggregateEventsTimeseries(widget);
            }
            return aggregateEventsKpi(widget);
        }
        case 'mouse_heatmap': {
            const period = widget.config?.mouse?.period || '7d';
            const page = widget.config?.mouse?.page || null;
            const pages = await getTrackedPages(widget.applicationId, period);
            const selected = page || pages[0]?.page || null;
            if (!selected) {
                return { period, page: null, pages, movements: null, snapshot: null };
            }
            const movements = await getMouseMovements(
                widget.applicationId,
                selected,
                period,
            );
            // Snapshot omitted on push v1; HTTP still loads it on first paint.
            return { period, page: selected, pages, movements, snapshot: null };
        }
        default:
            return null;
    }
}

/** Best-effort accessor: socket may not be initialized yet (e.g. tests). */
function tryGetIO() {
    try {
        return getIO();
    } catch (err) {
        console.error('[analytics] socket.io not initialized:', err.message);
        return null;
    }
}

async function pushWidget(widget) {
    const data = await computeWidgetPayload(widget);
    if (data == null) return;

    const io = tryGetIO();
    if (!io) return;

    io.of('/analytics').to(appRoom(widget.applicationId)).emit('widget:data', {
        applicationId: widget.applicationId,
        widgetId: widget.id,
        type: widget.type,
        updatedAt: widget.updatedAt,
        data,
    });
}

async function pushAllWidgetsForApp(applicationId) {
    const widgets = await Widget.findAll({
        where: { applicationId },
        order: [['position', 'ASC'], ['id', 'ASC']],
    });

    for (const widget of widgets) {
        try {
            await pushWidget(widget);
        } catch (err) {
            console.error('[analytics] push widget failed', widget.id, err.message);
        }
    }
}

function scheduleAnalyticsPush(applicationId) {
    const id = Number(applicationId);
    if (!Number.isFinite(id)) return;

    const existing = timers.get(id);
    if (existing) clearTimeout(existing);

    timers.set(
        id,
        setTimeout(() => {
            timers.delete(id);
            pushAllWidgetsForApp(id).catch((err) => {
                console.error('[analytics] pushAll failed', id, err.message);
            });
        }, DEBOUNCE_MS),
    );
}

module.exports = {
    DEBOUNCE_MS,
    appRoom,
    computeWidgetPayload,
    pushWidget,
    pushAllWidgetsForApp,
    scheduleAnalyticsPush,
};
