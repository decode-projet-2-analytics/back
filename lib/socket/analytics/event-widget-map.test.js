// decode-project-2-analytics-back/lib/socket/analytics/event-widget-map.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    mapEventTypeToWidgetTypes,
    BEHAVIORAL_WIDGET_TYPES,
} = require('./event-widget-map');

describe('mapEventTypeToWidgetTypes', () => {
    it('maps mousemove to mouse_heatmap only', () => {
        assert.deepEqual(mapEventTypeToWidgetTypes('mousemove'), ['mouse_heatmap']);
    });

    it('maps scroll to scroll_depth only', () => {
        assert.deepEqual(mapEventTypeToWidgetTypes('scroll'), ['scroll_depth']);
    });

    it('maps behavioral events to the behavioral set', () => {
        for (const type of ['pageview', 'click', 'tabchange', 'form_submit', 'event']) {
            assert.deepEqual(mapEventTypeToWidgetTypes(type), BEHAVIORAL_WIDGET_TYPES);
        }
    });

    it('falls back to the behavioral set for unknown or missing types', () => {
        assert.deepEqual(mapEventTypeToWidgetTypes('totally-unknown'), BEHAVIORAL_WIDGET_TYPES);
        assert.deepEqual(mapEventTypeToWidgetTypes(undefined), BEHAVIORAL_WIDGET_TYPES);
    });
});
