const { EventMirror } = require('../mongo-models');
const { buildEventMatch, resolveTimeRange } = require('./kpi');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MINUTE_MS = 60 * 1000;

function resolveMetricValue(count, uniqueSessions, metric) {
    if (metric === 'rate') {
        return uniqueSessions > 0 ? count / uniqueSessions : 0;
    }
    return count;
}

function resolveHeatmapLayout(from, to, step) {
    const rangeMs = to.getTime() - from.getTime();
    const rangeHours = rangeMs / HOUR_MS;
    const rangeDays = rangeMs / DAY_MS;

    if (rangeHours <= 1.5) {
        return {
            layout: 'minute_slots',
            rows: 1,
            cols: 12,
            bucketMs: 5 * MINUTE_MS,
            labelKey: 'heatmapLayoutMinutes',
            rowLabelType: 'none',
            colLabelType: 'minute',
        };
    }

    if (rangeHours <= 25) {
        return {
            layout: 'hour_of_day',
            rows: 1,
            cols: 24,
            labelKey: 'heatmapLayoutHourly',
            rowLabelType: 'none',
            colLabelType: 'hour',
        };
    }

    if (rangeDays <= 8) {
        if (step === '1w') {
            return {
                layout: 'day_slots',
                rows: 1,
                cols: 7,
                bucketMs: DAY_MS,
                slotCount: 7,
                labelKey: 'heatmapLayoutDaily',
                rowLabelType: 'none',
                colLabelType: 'day_index',
            };
        }

        if (step === '1d') {
            return {
                layout: 'day_slots',
                rows: 1,
                cols: 7,
                bucketMs: DAY_MS,
                slotCount: 7,
                labelKey: 'heatmapLayoutDaily',
                rowLabelType: 'none',
                colLabelType: 'day_index',
            };
        }

        return {
            layout: 'day_hour',
            rows: 7,
            cols: 24,
            bucketMs: HOUR_MS,
            labelKey: 'heatmapLayoutDayHour',
            rowLabelType: 'day_index',
            colLabelType: 'hour',
        };
    }

    if (step === '1w') {
        const weeks = Math.min(5, Math.max(1, Math.ceil(rangeDays / 7)));
        return {
            layout: 'week_slots',
            rows: 1,
            cols: weeks,
            bucketMs: WEEK_MS,
            slotCount: weeks,
            labelKey: 'heatmapLayoutWeekly',
            rowLabelType: 'none',
            colLabelType: 'week_index',
        };
    }

    if (step === '1d') {
        const days = Math.min(30, Math.max(1, Math.ceil(rangeDays)));
        const cols = 6;
        const rows = Math.ceil(days / cols);
        return {
            layout: 'day_slots',
            rows,
            cols,
            bucketMs: DAY_MS,
            slotCount: days,
            labelKey: 'heatmapLayoutDaily',
            rowLabelType: 'none',
            colLabelType: rows === 1 ? 'day_index' : 'none',
        };
    }

    return {
        layout: 'weekday_hour',
        rows: 7,
        cols: 24,
        labelKey: 'heatmapLayoutWeekdayHour',
        rowLabelType: 'weekday',
        colLabelType: 'hour',
    };
}

async function groupCells(match, groupIdExpression, metric) {
    const rows = await EventMirror.aggregate([
        { $match: match },
        {
            $group: {
                _id: groupIdExpression,
                count: { $sum: 1 },
                sessions: { $addToSet: '$sessionId' },
            },
        },
    ]);

    return rows.map((row) => ({
        id: row._id,
        value: resolveMetricValue(row.count, row.sessions?.length ?? 0, metric),
    }));
}

function indexToRowCol(index, cols) {
    return {
        row: Math.floor(index / cols),
        col: index % cols,
    };
}

async function aggregateHeatmap(widget) {
    const match = buildEventMatch(widget);
    const { from, to } = resolveTimeRange(widget.config?.timeRange);
    const step = widget.config?.timeRange?.step ?? '1h';
    const metric = widget.config?.metric ?? 'count';
    const layout = resolveHeatmapLayout(from, to, step);
    const fromMs = from.getTime();

    let cells = [];

    switch (layout.layout) {
        case 'minute_slots': {
            const grouped = await groupCells(
                match,
                {
                    $floor: {
                        $divide: [
                            { $subtract: [{ $toLong: '$createdAt' }, fromMs] },
                            layout.bucketMs,
                        ],
                    },
                },
                metric
            );
            cells = grouped.map((entry) => ({
                row: 0,
                col: entry.id,
                value: entry.value,
            }));
            break;
        }

        case 'hour_of_day': {
            const grouped = await groupCells(match, { $hour: '$createdAt' }, metric);
            cells = grouped.map((entry) => ({
                row: 0,
                col: entry.id,
                value: entry.value,
            }));
            break;
        }

        case 'day_hour': {
            const grouped = await groupCells(
                match,
                {
                    row: {
                        $min: [
                            6,
                            {
                                $floor: {
                                    $divide: [
                                        { $subtract: [{ $toLong: '$createdAt' }, fromMs] },
                                        DAY_MS,
                                    ],
                                },
                            },
                        ],
                    },
                    col: { $hour: '$createdAt' },
                },
                metric
            );
            cells = grouped.map((entry) => ({
                row: entry.id.row,
                col: entry.id.col,
                value: entry.value,
            }));
            break;
        }

        case 'weekday_hour': {
            const grouped = await groupCells(
                match,
                {
                    row: { $subtract: [{ $dayOfWeek: '$createdAt' }, 1] },
                    col: { $hour: '$createdAt' },
                },
                metric
            );
            cells = grouped.map((entry) => ({
                row: entry.id.row,
                col: entry.id.col,
                value: entry.value,
            }));
            break;
        }

        case 'day_slots': {
            const grouped = await groupCells(
                match,
                {
                    $floor: {
                        $divide: [
                            { $subtract: [{ $toLong: '$createdAt' }, fromMs] },
                            layout.bucketMs,
                        ],
                    },
                },
                metric
            );
            const valueByIndex = new Map(
                grouped.map((entry) => [entry.id, entry.value])
            );

            for (let index = 0; index < layout.slotCount; index += 1) {
                const { row, col } = indexToRowCol(index, layout.cols);
                cells.push({
                    row,
                    col,
                    value: valueByIndex.get(index) ?? 0,
                });
            }
            break;
        }

        case 'week_slots': {
            const grouped = await groupCells(
                match,
                {
                    $floor: {
                        $divide: [
                            { $subtract: [{ $toLong: '$createdAt' }, fromMs] },
                            layout.bucketMs,
                        ],
                    },
                },
                metric
            );
            cells = grouped.map((entry) => ({
                row: 0,
                col: entry.id,
                value: entry.value,
            }));
            break;
        }

        default:
            break;
    }

    const max = cells.reduce((peak, cell) => Math.max(peak, cell.value), 0);
    const [totalRow] = await groupCells(match, null, metric);
    const total = totalRow?.value ?? 0;

    return {
        metric,
        step,
        layout: layout.layout,
        rows: layout.rows,
        cols: layout.cols,
        labelKey: layout.labelKey,
        rowLabelType: layout.rowLabelType,
        colLabelType: layout.colLabelType,
        slotCount: layout.slotCount ?? null,
        cells,
        max,
        total,
    };
}

module.exports = { aggregateHeatmap, resolveHeatmapLayout };
