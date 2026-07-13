const Widget = require('../../models/widget');
const { ownershipScope } = require('../utils/ownership-scope');
const { aggregateFunnel } = require('../aggregations/funnel');
const { aggregateEventsKpi } = require('../aggregations/events-kpi');
const { aggregateEventsTimeseries } = require('../aggregations/events-timeseries');
const { aggregateBreakdown } = require('../aggregations/breakdown');
const { aggregateScrollDepth } = require('../aggregations/scroll-depth');

async function getWidgetData(req, res, next) {
    try {
        const widget = await Widget.findOne({
            where: {
                ...ownershipScope(req),
                id: req.params.id,
            },
        });

        if (!widget) {
            res.sendStatus(404);
            return;
        }

        switch (widget.type) {
            case 'funnel':
                try {
                    res.json(await aggregateFunnel(widget));
                } catch (error) {
                    if (error.status) {
                        res.status(error.status).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
                return;
            case 'events':
                try {
                    const viz = widget.config?.visualization || 'nombre';
                    if (
                        viz === 'line'
                        || viz === 'timeseries'
                        || viz === 'activity'
                        || viz === 'heatmap'
                    ) {
                        res.json(await aggregateEventsTimeseries(widget));
                    } else {
                        res.json(await aggregateEventsKpi(widget));
                    }
                } catch (error) {
                    if (error.status) {
                        res.status(error.status).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
                return;
            case 'breakdown':
                try {
                    res.json(await aggregateBreakdown(widget));
                } catch (error) {
                    if (error.status) {
                        res.status(error.status).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
                return;
            case 'scroll_depth':
                try {
                    res.json(await aggregateScrollDepth(widget));
                } catch (error) {
                    if (error.status) {
                        res.status(error.status).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
                return;
            default:
                res.status(501).json({ message: 'Widget type not supported yet' });
        }
    } catch (error) {
        next(error);
    }
}

module.exports = { getWidgetData };
