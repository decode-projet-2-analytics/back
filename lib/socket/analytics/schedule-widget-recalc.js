// decode-project-2-analytics-back/lib/socket/analytics/schedule-widget-recalc.js
const DEFAULT_DELAY_MS = 2000;

/**
 * Debounce widget recomputation per widgetId. Repeated schedule() calls for the
 * same widget within delayMs collapse into a single push using the latest
 * widget object.
 *
 * @param {{ delayMs?: number, push: (widget: any) => Promise<void> }} options
 */
function createRecalcScheduler({ delayMs = DEFAULT_DELAY_MS, push }) {
    if (typeof push !== 'function') {
        throw new Error('createRecalcScheduler requires a push function');
    }

    /** @type {Map<number, { timer: NodeJS.Timeout, widget: any }>} */
    const pending = new Map();

    function schedule(widget) {
        const id = Number(widget?.id);
        if (!Number.isFinite(id)) return;

        const existing = pending.get(id);
        if (existing) clearTimeout(existing.timer);

        const timer = setTimeout(() => {
            const entry = pending.get(id);
            pending.delete(id);
            const target = entry ? entry.widget : widget;
            Promise.resolve()
                .then(() => push(target))
                .catch((err) => {
                    console.error('[analytics] widget recalc push failed', id, err.message);
                });
        }, delayMs);

        pending.set(id, { timer, widget });
    }

    function clearAll() {
        for (const { timer } of pending.values()) clearTimeout(timer);
        pending.clear();
    }

    return { schedule, clearAll };
}

module.exports = { createRecalcScheduler, DEFAULT_DELAY_MS };
