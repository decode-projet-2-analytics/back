const { EventMirror } = require('../mongo-models');

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;

function resolveTimeRange(timeRange = {}) {
    const to = timeRange.to ? new Date(timeRange.to) : new Date();
    const from = timeRange.from
        ? new Date(timeRange.from)
        : new Date(to.getTime() - DEFAULT_RANGE_MS);

    return { from, to };
}

function buildEventMatch(widget) {
    const { from, to } = resolveTimeRange(widget.config?.timeRange);
    const filters = widget.config?.filters ?? {};

    const match = {
        applicationId: widget.applicationId,
        createdAt: { $gte: from, $lte: to },
    };

    if (filters.type) {
        match.type = filters.type;
    }

    if (filters.tagId != null && filters.tagId !== '') {
        match.tagId = Number(filters.tagId);
    }

    return match;
}

async function aggregateKpi(widget) {
    const match = buildEventMatch(widget);

    const [result] = await EventMirror.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                sessions: { $addToSet: '$sessionId' },
            },
        },
    ]);

    const count = result?.count ?? 0;
    const uniqueSessions = result?.sessions?.length ?? 0;

    if (widget.config?.metric === 'rate') {
        const value = uniqueSessions > 0 ? count / uniqueSessions : 0;
        return { value, metric: 'rate', count, uniqueSessions };
    }

    return { value: count, metric: 'count' };
}

module.exports = { aggregateKpi, resolveTimeRange, buildEventMatch };
