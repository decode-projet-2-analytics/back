const { Op } = require('sequelize');
const connection = require('../db');
const Session = require('../../models/session');

// applicationId:sdkSessionId -> Session.id (numeric). Process-lifetime cache.
const sessionCache = new Map();

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

module.exports = { ensureSession };
