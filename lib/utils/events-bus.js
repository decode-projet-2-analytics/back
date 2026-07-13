/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

const ANALYTICS_INGESTED = 'analytics:ingested';

function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
}

function emit(event, ...args) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of set) {
        try {
            fn(...args);
        } catch (err) {
            console.error(`[events] listener error on "${event}":`, err.message);
        }
    }
}

module.exports = { on, emit, ANALYTICS_INGESTED };
