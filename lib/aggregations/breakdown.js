const { EventMirror } = require('../mongo-models');
const { buildEventMatch } = require('./event-match');

const TOP_N = 10;

// Supported dimensions -> the Mongo field to group by. Both live on `pageview`
// events (payload.url / payload.referrer), which is why we default the event
// type to 'pageview' when the widget has no explicit type filter.
const GROUP_FIELDS = {
    url: '$payload.url',
    referrer: '$payload.referrer',
};

function resolveGroupBy(widget) {
    const groupBy = widget.config?.filters?.groupBy;
    return GROUP_FIELDS[groupBy] ? groupBy : 'url';
}

async function aggregateBreakdown(widget) {
    const match = buildEventMatch(widget);
    const metric = widget.config?.metric ?? 'count';
    const groupBy = resolveGroupBy(widget);

    // These dimensions only exist on pageview events; scope to them unless the
    // user explicitly filtered on another event type.
    if (!match.type) {
        match.type = 'pageview';
    }

    const rows = await EventMirror.aggregate([
        { $match: match },
        {
            $group: {
                _id: GROUP_FIELDS[groupBy],
                count: { $sum: 1 },
                sessions: { $addToSet: '$sessionId' },
            },
        },
        { $sort: { count: -1 } },
        { $limit: TOP_N },
    ]);

    let total = 0;
    const items = rows.map((row) => {
        const count = row.count ?? 0;
        const uniqueSessions = row.sessions?.length ?? 0;
        const value =
            metric === 'rate'
                ? uniqueSessions > 0
                    ? count / uniqueSessions
                    : 0
                : count;
        total += value;
        return { key: row._id ?? '', value };
    });

    return { metric, groupBy, rows: items, total };
}

module.exports = { aggregateBreakdown };
