// decode-project-2-analytics-back/lib/socket/analytics/event-widget-map.js
const BEHAVIORAL_WIDGET_TYPES = ['events', 'funnel', 'breakdown', 'retention'];

const EXPLICIT_MAP = {
    mousemove: ['mouse_heatmap'],
    scroll: ['scroll_depth'],
    pageview: BEHAVIORAL_WIDGET_TYPES,
    click: BEHAVIORAL_WIDGET_TYPES,
    tabchange: BEHAVIORAL_WIDGET_TYPES,
    form_submit: BEHAVIORAL_WIDGET_TYPES,
    event: BEHAVIORAL_WIDGET_TYPES,
};

function mapEventTypeToWidgetTypes(eventType) {
    return EXPLICIT_MAP[eventType] ?? BEHAVIORAL_WIDGET_TYPES;
}

module.exports = { mapEventTypeToWidgetTypes, BEHAVIORAL_WIDGET_TYPES };
