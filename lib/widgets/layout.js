const GRID_COLS = 12;
const DEFAULT_LAYOUT = { x: 0, y: 0, w: 4, h: 4 };
const FULL_WIDTH_TYPES = new Set(['mouse_heatmap', 'funnel']);

function normalizeLayout(layout) {
    const l = { ...DEFAULT_LAYOUT, ...(layout || {}) };
    l.w = Math.min(GRID_COLS, Math.max(3, Number(l.w) || 4));
    l.h = Math.max(4, Number(l.h) || 4);
    l.x = Math.max(0, Math.min(GRID_COLS - l.w, Number(l.x) || 0));
    l.y = Math.max(0, Number(l.y) || 0);
    return l;
}

function normalizeWidgetLayout(type, layout) {
    if (FULL_WIDTH_TYPES.has(type) && (layout === undefined || layout === null)) {
        return normalizeLayout({ w: 12 });
    }
    return normalizeLayout(layout);
}

module.exports = { GRID_COLS, DEFAULT_LAYOUT, FULL_WIDTH_TYPES, normalizeLayout, normalizeWidgetLayout };
