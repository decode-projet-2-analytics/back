const { Op } = require('sequelize');
const connection = require('./db');
const Tunnel = require('../models/tunnel');
const Tag = require('../models/tag');
const Session = require('../models/session');
const Event = require('../models/event');
const PageSnapshot = require('../models/mongo-snapshot');

/**
 * Ingestion of the SDK `SessionPayload`.
 *
 * The SDK sends one enriched payload per flush:
 *   { sessionId, url, flushedAt, page:{viewport,docSize,...}, mousemove?, scroll?, snapshot? }
 *
 * We fan it out into Postgres `Event` rows (which are mirrored to Mongo
 * `sync_events` automatically by lib/mongo-sync.js, where analytics read from).
 * The page screenshot is stored separately in Mongo (`page_snapshots`) because
 * it is large.
 *
 * `Event` requires a sessionId + tagId (FKs), so we lazily provision a default
 * Tunnel + Tag per application and a Session per SDK session id.
 */

const SDK_TUNNEL_COMMENT = 'SDK default tunnel';
const SDK_TAG_COMMENT = 'SDK default tag';

// applicationId -> default Tag.id (numeric). Process-lifetime cache.
const defaultTagCache = new Map();
// sdkSessionId -> Session.id (numeric). Process-lifetime cache.
const sessionCache = new Map();
// `${applicationId}:${sessionId}:${url}` seen -> pageview already emitted.
// The SDK re-sends page meta on every flush, so we emit one pageview per
// (session, url) instead of one per flush. Process-lifetime cache.
const pageviewCache = new Set();

/** Find-or-create the default Tunnel+Tag used to attach SDK events. */
async function ensureDefaultTag(applicationId) {
    const cached = defaultTagCache.get(applicationId);
    if (cached) return cached;

    let tunnel = await Tunnel.findOne({
        where: { applicationId, comment: SDK_TUNNEL_COMMENT },
    });
    if (!tunnel) {
        tunnel = await Tunnel.create({ applicationId, comment: SDK_TUNNEL_COMMENT });
    }

    let tag = await Tag.findOne({
        where: { applicationId, comment: SDK_TAG_COMMENT },
    });
    if (!tag) {
        tag = await Tag.create({
            applicationId,
            comment: SDK_TAG_COMMENT,
            tunnelId: tunnel.tunnelId,
        });
    }

    defaultTagCache.set(applicationId, tag.id);
    return tag.id;
}

/** Find-or-create the Session matching an SDK (string) session id. */
async function ensureSession(applicationId, sdkSessionId) {
    const cacheKey = `${applicationId}:${sdkSessionId}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;

    let session = await Session.findOne({
        where: {
            applicationId,
            [Op.and]: [
                connection.where(
                    connection.literal(`"metadata"->>'sdkSessionId'`),
                    String(sdkSessionId),
                ),
            ],
        },
    });
    if (!session) {
        session = await Session.create({
            applicationId,
            startedAt: new Date(),
            metadata: { sdkSessionId: String(sdkSessionId) },
        });
    }

    sessionCache.set(cacheKey, session.id);
    return session.id;
}

/** Upsert the latest screenshot for a page. Never throws (best-effort). */
async function storeSnapshot(applicationId, url, snapshot) {
    try {
        await PageSnapshot.findOneAndUpdate(
            { applicationId, url },
            {
                $set: {
                    image: snapshot.image,
                    width: snapshot.width,
                    height: snapshot.height,
                    capturedAt: snapshot.capturedAt
                        ? new Date(snapshot.capturedAt)
                        : new Date(),
                },
            },
            { upsert: true },
        );
    } catch (error) {
        console.error('[ingest] snapshot upsert failed:', error.message);
    }
}

/**
 * Fan out one SDK SessionPayload into events + snapshot.
 * @returns {Promise<{ created: string[] }>} list of event types created
 */
async function ingestSessionPayload(applicationId, payload) {
    if (!payload || typeof payload !== 'object' || typeof payload.url !== 'string') {
        const error = new Error('Invalid payload');
        error.status = 400;
        throw error;
    }

    const url = payload.url;
    const docSize = payload.page?.docSize ?? null;
    const viewport = payload.page?.viewport ?? null;

    const [tagId, sessionId] = await Promise.all([
        ensureDefaultTag(applicationId),
        ensureSession(applicationId, payload.sessionId ?? 'anonymous'),
    ]);

    const created = [];

    // Pageview: `page` is always present, but re-sent on every flush, so we
    // emit exactly one pageview per (session, url).
    const pageviewKey = `${applicationId}:${sessionId}:${url}`;
    if (!pageviewCache.has(pageviewKey)) {
        pageviewCache.add(pageviewKey);
        await Event.create({
            type: 'pageview',
            payload: {
                url,
                title: payload.page?.title,
                referrer: payload.page?.referrer,
                viewport,
                docSize,
            },
            applicationId,
            sessionId,
            tagId,
        });
        created.push('pageview');
    }

    if (Array.isArray(payload.mousemove?.points) && payload.mousemove.points.length > 0) {
        await Event.create({
            type: 'mousemove',
            payload: { url, points: payload.mousemove.points, docSize, viewport },
            applicationId,
            sessionId,
            tagId,
        });
        created.push('mousemove');
    }

    if (Array.isArray(payload.scroll?.samples) && payload.scroll.samples.length > 0) {
        await Event.create({
            type: 'scroll',
            // viewport is needed to compute scroll depth (scrollY + viewport.height).
            payload: { url, samples: payload.scroll.samples, docSize, viewport },
            applicationId,
            sessionId,
            tagId,
        });
        created.push('scroll');
    }

    if (Array.isArray(payload.clicks?.items) && payload.clicks.items.length > 0) {
        await Event.create({
            type: 'click',
            payload: { url, items: payload.clicks.items, docSize, viewport },
            applicationId,
            sessionId,
            tagId,
        });
        created.push('click');
    }

    if (payload.snapshot?.image) {
        await storeSnapshot(applicationId, url, payload.snapshot);
        created.push('snapshot');
    }

    return { created };
}

module.exports = { ingestSessionPayload };
