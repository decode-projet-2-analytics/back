const { EventMirror } = require('../mongo-models');
const { buildEventMatch, resolveTimeRange } = require('./kpi');

const STEP_MS = {
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
};

function getStepMs(step) {
    return STEP_MS[step] ?? STEP_MS['1h'];
}

function fillTimeseriesPoints(from, to, stepMs, rawPoints) {
    const map = new Map(
        rawPoints.map((point) => [new Date(point.at).getTime(), point.value])
    );

    const points = [];
    let cursor = Math.floor(from.getTime() / stepMs) * stepMs;
    const end = to.getTime();

    while (cursor <= end) {
        points.push({
            at: new Date(cursor).toISOString(),
            value: map.get(cursor) ?? 0,
        });
        cursor += stepMs;
    }

    return points;
}

async function aggregateTimeseries(widget) {
    const match = buildEventMatch(widget);
    const { from, to } = resolveTimeRange(widget.config?.timeRange);
    const step = widget.config?.timeRange?.step ?? '1h';
    const stepMs = getStepMs(step);
    const metric = widget.config?.metric ?? 'count';

    const rows = await EventMirror.aggregate([
        { $match: match },
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

    const rawPoints = rows.map((row) => {
        const count = row.count ?? 0;
        const uniqueSessions = row.sessions?.length ?? 0;
        const value =
            metric === 'rate'
                ? uniqueSessions > 0
                    ? count / uniqueSessions
                    : 0
                : count;

        return {
            at: row._id.toISOString(),
            value,
        };
    });

    return {
        metric,
        step,
        points: fillTimeseriesPoints(from, to, stepMs, rawPoints),
    };
}

module.exports = { aggregateTimeseries };
