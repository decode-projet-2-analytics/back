const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;

const PERIOD_MS = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

const STEP_MS = {
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
};

/**
 * Resolve widget time ranges as a sliding window ending at "now".
 * Absolute from/to saved at configure time are treated as a duration so
 * "Dernières 24h" keeps including new events without re-saving the widget.
 */
function resolveTimeRange(timeRange = {}) {
    const now = new Date(Date.now());
    const preset = timeRange.preset || timeRange.period;

    if (preset && PERIOD_MS[preset]) {
        return {
            from: new Date(now.getTime() - PERIOD_MS[preset]),
            to: now,
        };
    }

    if (timeRange.from && timeRange.to) {
        const duration = Math.max(
            0,
            new Date(timeRange.to).getTime() - new Date(timeRange.from).getTime(),
        );
        return {
            from: new Date(now.getTime() - (duration || DEFAULT_RANGE_MS)),
            to: now,
        };
    }

    if (timeRange.from && !timeRange.to) {
        return { from: new Date(timeRange.from), to: now };
    }

    return {
        from: new Date(now.getTime() - DEFAULT_RANGE_MS),
        to: now,
    };
}

function getStepMs(step) {
    return STEP_MS[step] ?? STEP_MS['1h'];
}

function fillTimeseriesPoints(from, to, stepMs, rawPoints) {
    const map = new Map();
    for (const point of rawPoints) {
        const bucket =
            Math.floor(new Date(point.at).getTime() / stepMs) * stepMs;
        map.set(bucket, (map.get(bucket) ?? 0) + (point.value ?? 0));
    }

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

module.exports = { resolveTimeRange, getStepMs, fillTimeseriesPoints };
