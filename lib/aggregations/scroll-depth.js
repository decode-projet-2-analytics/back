const { EventMirror } = require('../mongo-models');
const { buildEventMatch } = require('./event-match');

// Four fixed depth bands (percent of page reached).
const BUCKET_RANGES = ['0-25', '25-50', '50-75', '75-100'];

function bucketIndex(depth) {
    return Math.min(BUCKET_RANGES.length - 1, Math.floor(depth / 25));
}

/**
 * Per-session maximum scroll depth (%), distributed into four bands, plus the
 * average across sessions. Depth = (scrollY + viewportHeight) / docHeight,
 * capped at 100. Only scroll events carry the data, so we scope to them.
 */
async function aggregateScrollDepth(widget) {
    const match = buildEventMatch(widget);
    match.type = 'scroll';

    const rows = await EventMirror.aggregate([
        { $match: match },
        { $unwind: '$payload.samples' },
        {
            $project: {
                sessionId: 1,
                depth: {
                    $let: {
                        vars: {
                            docH: { $ifNull: ['$payload.docSize.height', 0] },
                            vpH: { $ifNull: ['$payload.viewport.height', 0] },
                            y: { $ifNull: ['$payload.samples.scrollY', 0] },
                        },
                        in: {
                            $cond: [
                                { $gt: ['$$docH', 0] },
                                {
                                    $min: [
                                        100,
                                        {
                                            $multiply: [
                                                { $divide: [{ $add: ['$$y', '$$vpH'] }, '$$docH'] },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
            },
        },
        { $group: { _id: '$sessionId', maxDepth: { $max: '$depth' } } },
    ]);

    const counts = BUCKET_RANGES.map(() => 0);
    let sum = 0;

    for (const row of rows) {
        const depth = row.maxDepth ?? 0;
        sum += depth;
        counts[bucketIndex(depth)] += 1;
    }

    const sessionsTracked = rows.length;
    const average = sessionsTracked > 0 ? sum / sessionsTracked : 0;

    return {
        average,
        buckets: BUCKET_RANGES.map((range, index) => ({
            range,
            sessions: counts[index],
        })),
        sessionsTracked,
    };
}

module.exports = { aggregateScrollDepth };
