const { EventMirror } = require('../mongo-models');
const { resolveTimeRange, fillTimeseriesPoints, getStepMs } = require('../utils/time-range');
const {
    buildEventsSeriesMatch,
    buildEventsValue,
    normalizeEventsMetric,
    normalizeEventsSeries,
} = require('./events-kpi');

function resolveTimeseriesVisualization(widget) {
    const viz = widget.config?.visualization;
    if (viz === 'activity' || viz === 'heatmap') return 'activity';
    return 'line';
}

async function aggregateEventsTimeseries(widget) {
    const visualization = resolveTimeseriesVisualization(widget);
    const { from, to } = resolveTimeRange(widget.config?.timeRange);
    const step = widget.config?.timeRange?.step ?? '1h';
    const stepMs = getStepMs(step);
    const metric = normalizeEventsMetric(widget.config?.metric);
    const series = normalizeEventsSeries(widget.config?.series);

    const values = await Promise.all(series.map(async (item) => {
        const rows = await EventMirror.aggregate([
            { $match: buildEventsSeriesMatch(widget, item) },
            {
                $group: {
                    _id: {
                        $toDate: {
                            $subtract: [
                                { $toLong: '$createdAt' },
                                { $mod: [{ $toLong: '$createdAt' }, stepMs] },
                            ],
                        },
                    },
                    count: { $sum: 1 },
                    sessions: { $addToSet: '$sessionId' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const rawPoints = rows.map((row) => ({
            at: row._id.toISOString(),
            value: buildEventsValue(row, metric),
        }));

        return {
            name: item.name || 'All',
            points: fillTimeseriesPoints(from, to, stepMs, rawPoints),
        };
    }));

    return {
        visualization,
        step,
        metric,
        series: values,
    };
}

module.exports = { aggregateEventsTimeseries };
