function loadDefaultDependencies() {
    const Tag = require('../../models/tag');
    const Event = require('../../models/event');
    const { ensureSession } = require('./ensure-session');

    return {
        Tag,
        Event,
        ensureSession,
    };
}

function requiredString(value, field) {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
        const error = new Error(`${field} is required`);
        error.status = 400;
        throw error;
    }
    return normalized;
}

function requiredSessionId(value) {
    if (value == null || (typeof value === 'string' && !value.trim())) {
        const error = new Error('sessionId is required');
        error.status = 400;
        throw error;
    }
    return typeof value === 'string' ? value.trim() : value;
}

function objectOrEmpty(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function ingestServerEvent(applicationId, body, providedDependencies) {
    const dependencies = providedDependencies ?? loadDefaultDependencies();
    const input = body && typeof body === 'object' ? body : {};
    const type = requiredString(input.type, 'type');
    const tagSlug = requiredString(input.tagSlug, 'tagSlug');
    const sdkSessionId = requiredSessionId(input.sessionId);

    const tag = await dependencies.Tag.findOne({
        where: { slug: tagSlug, applicationId },
    });
    if (!tag) {
        const error = new Error('Tag not found');
        error.status = 404;
        throw error;
    }

    const sessionId = await dependencies.ensureSession(applicationId, sdkSessionId);
    const event = await dependencies.Event.create({
        type,
        payload: objectOrEmpty(input.payload),
        metadata: objectOrEmpty(input.metadata),
        applicationId,
        sessionId,
        tagId: tag.id,
    });

    return event;
}

module.exports = { ingestServerEvent };
