const { resolveTimeRange } = require('../utils/time-range');

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

module.exports = { buildEventMatch };
