const { EventMirror } = require('../mongo-models');
const { resolveTimeRange } = require('../utils/time-range');
const { buildMetadataMatch } = require('../utils/metadata-match');

/** @typedef {'count' | 'sessions'} EventsMetric */

/**
 * Normalize stored metric. Legacy `rate` / `share` map to `count`.
 * @param {string | undefined} metric
 * @returns {EventsMetric}
 */
function normalizeEventsMetric(metric) {
    if (metric === 'sessions') return 'sessions';
    return 'count';
}

function normalizeEventsSeries(series) {
    return Array.isArray(series) && series.length > 0
        ? series
        : [{ name: 'All', filters: [] }];
}

function requireEventsTagId(widget) {
    const tagId = widget.config?.tagId;
    if (tagId == null || tagId === '') {
        const err = new Error('Events widget requires config.tagId');
        err.status = 400;
        throw err;
    }
    return Number(tagId);
}

function buildEventsSeriesMatch(widget, series = {}) {
    const { from, to } = resolveTimeRange(widget.config?.timeRange);
    return {
        applicationId: widget.applicationId,
        type: 'event',
        tagId: requireEventsTagId(widget),
        createdAt: { $gte: from, $lte: to },
        ...buildMetadataMatch(series.filters),
    };
}

/**
 * @param {{ count?: number, sessions?: unknown[] } | null | undefined} result
 * @param {EventsMetric} metric
 */
function buildEventsValue(result, metric) {
    const count = result?.count ?? 0;
    const uniqueSessions = result?.sessions?.length ?? 0;

    if (metric === 'sessions') return uniqueSessions;
    return count;
}

function resolveVisualization(widget) {
    const viz = widget.config?.visualization;
    if (viz === 'line' || viz === 'timeseries') return 'line';
    if (
        viz === 'bar'
        || viz === 'pie'
        || viz === 'doughnut'
        || viz === 'comparison'
    ) {
        return viz === 'comparison' ? 'bar' : viz;
    }
    return 'nombre';
}

async function aggregateEventsKpi(widget) {
    const metric = normalizeEventsMetric(widget.config?.metric);
    const series = normalizeEventsSeries(widget.config?.series);
    const visualization = resolveVisualization(widget);

    const values = await Promise.all(series.map(async (item) => {
        const [result] = await EventMirror.aggregate([
            { $match: buildEventsSeriesMatch(widget, item) },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    sessions: { $addToSet: '$sessionId' },
                },
            },
        ]);

        return {
            name: item.name || 'All',
            value: buildEventsValue(result, metric),
        };
    }));

    return {
        visualization,
        series: values,
        metric,
    };
}

module.exports = {
    aggregateEventsKpi,
    buildEventsSeriesMatch,
    buildEventsValue,
    normalizeEventsMetric,
    normalizeEventsSeries,
};
