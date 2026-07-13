function buildConversionRate(firstCount, lastCount) {
    if (!firstCount) return 0;
    return lastCount / firstCount;
}

function buildDropOff(steps) {
    const dropOff = [];
    for (let i = 0; i < steps.length - 1; i++) {
        const from = steps[i];
        const to = steps[i + 1];
        const lost = Math.max(0, from.count - to.count);
        const rate = from.count > 0 ? lost / from.count : 0;
        dropOff.push({
            fromIndex: from.index,
            toIndex: to.index,
            lost,
            rate,
        });
    }
    return dropOff;
}

function buildFunnelPayload({ tunnelId, tunnelName, steps }) {
    const first = steps[0]?.count ?? 0;
    const last = steps[steps.length - 1]?.count ?? 0;
    return {
        tunnelId,
        tunnelName,
        metric: 'count',
        steps,
        conversionRate: buildConversionRate(first, last),
        dropOff: buildDropOff(steps),
    };
}

async function countUniqueSessions({ applicationId, tagId, from, to }) {
    const { EventMirror } = require('../mongo-models');
    const rows = await EventMirror.aggregate([
        {
            $match: {
                applicationId,
                tagId,
                createdAt: { $gte: from, $lte: to },
            },
        },
        { $group: { _id: '$sessionId' } },
        { $count: 'count' },
    ]);
    return rows[0]?.count ?? 0;
}

async function aggregateFunnel(widget) {
    const Tunnel = require('../../models/tunnel');
    const Tag = require('../../models/tag');
    const { resolveTimeRange } = require('../utils/time-range');

    const tunnelId = widget.config?.tunnelId;
    if (tunnelId == null || tunnelId === '') {
        const err = new Error('Funnel widget requires config.tunnelId');
        err.status = 400;
        throw err;
    }

    const tunnel = await Tunnel.findOne({
        where: {
            id: Number(tunnelId),
            applicationId: widget.applicationId,
        },
    });

    if (!tunnel) {
        const err = new Error('Tunnel not found for funnel widget');
        err.status = 404;
        throw err;
    }

    const tagIds = Array.isArray(tunnel.tagIds) ? tunnel.tagIds : [];
    const tags = await Tag.findAll({
        where: {
            applicationId: widget.applicationId,
            id: tagIds,
        },
    });
    const tagById = new Map(tags.map((t) => [t.id, t]));

    const { from, to } = resolveTimeRange(widget.config?.timeRange);

    const steps = [];
    for (let index = 0; index < tagIds.length; index++) {
        const tagId = tagIds[index];
        const tag = tagById.get(tagId);
        const count = await countUniqueSessions({
            applicationId: widget.applicationId,
            tagId,
            from,
            to,
        });
        steps.push({
            index,
            tagId,
            slug: tag?.slug ?? String(tagId),
            label: tag?.comment || tag?.slug || String(tagId),
            count,
        });
    }

    return buildFunnelPayload({
        tunnelId: tunnel.id,
        tunnelName: tunnel.name,
        steps,
    });
}

module.exports = {
    aggregateFunnel,
    buildConversionRate,
    buildDropOff,
    buildFunnelPayload,
    countUniqueSessions,
};
