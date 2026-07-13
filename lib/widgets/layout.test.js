const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GRID_COLS, DEFAULT_LAYOUT, normalizeLayout, normalizeWidgetLayout } = require('./layout');

describe('normalizeLayout', () => {
    it('applies defaults for missing layout', () => {
        assert.deepEqual(normalizeLayout(), DEFAULT_LAYOUT);
    });

    it('clamps w between 3 and GRID_COLS', () => {
        assert.equal(normalizeLayout({ w: 1 }).w, 3);
        assert.equal(normalizeLayout({ w: 20 }).w, GRID_COLS);
    });

    it('clamps h to minimum 4', () => {
        assert.equal(normalizeLayout({ h: 1 }).h, 4);
        assert.equal(normalizeLayout({ h: 3 }).h, 4);
    });

    it('clamps x so widget stays within grid', () => {
        assert.equal(normalizeLayout({ x: 20, w: 4 }).x, GRID_COLS - 4);
    });

    it('clamps y to non-negative', () => {
        assert.equal(normalizeLayout({ y: -5 }).y, 0);
    });
});

describe('normalizeWidgetLayout', () => {
    it('defaults mouse_heatmap to full width', () => {
        assert.deepEqual(normalizeWidgetLayout('mouse_heatmap'), { x: 0, y: 0, w: 12, h: 4 });
    });

    it('defaults funnel to full width', () => {
        assert.deepEqual(normalizeWidgetLayout('funnel'), { x: 0, y: 0, w: 12, h: 4 });
    });

    it('uses standard defaults for other types', () => {
        assert.deepEqual(normalizeWidgetLayout('events'), DEFAULT_LAYOUT);
    });

    it('respects explicit layout for full-width types', () => {
        assert.equal(normalizeWidgetLayout('funnel', { w: 6 }).w, 6);
    });
});
