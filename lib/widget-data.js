const Widget = require('../models/widget');
const { ownershipScope } = require('./ownership-scope');
const { aggregateKpi } = require('./aggregations/kpi');
const { aggregateTimeseries } = require('./aggregations/timeseries');
const { aggregateHeatmap } = require('./aggregations/heatmap');

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
            case 'kpi': {
                const data = await aggregateKpi(widget);
                res.json(data);
                return;
            }
            case 'timeseries': {
                const data = await aggregateTimeseries(widget);
                res.json(data);
                return;
            }
            case 'heatmap': {
                const data = await aggregateHeatmap(widget);
                res.json(data);
                return;
            }
            default:
                res.status(501).json({ message: 'Widget type not supported yet' });
        }
    } catch (error) {
        next(error);
    }
}

module.exports = { getWidgetData };
