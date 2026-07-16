// decode-project-2-analytics-back/lib/socket/analytics/active-apps.js
/** @type {Map<number, number>} applicationId -> subscriber ref-count */
const counts = new Map();

function add(applicationId) {
    const id = Number(applicationId);
    if (!Number.isFinite(id)) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
}

function remove(applicationId) {
    const id = Number(applicationId);
    if (!Number.isFinite(id)) return;
    const next = (counts.get(id) ?? 0) - 1;
    if (next <= 0) {
        counts.delete(id);
    } else {
        counts.set(id, next);
    }
}

function has(applicationId) {
    return counts.has(Number(applicationId));
}

function count(applicationId) {
    return counts.get(Number(applicationId)) ?? 0;
}

module.exports = { add, remove, has, count };
