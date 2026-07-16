#!/usr/bin/env node
'use strict';

/**
 * Emit a fake analytics event exactly like the SDK server `track()` does
 * (createAnalyticsClient(...).track(event) → POST /server-events).
 *
 * Mirrors the SDK contract:
 *   headers: x-app-id, x-app-secret
 *   body:    { type, tagSlug, sessionId, payload, metadata }
 *
 * Usage:
 *   npm run test:fake-event -- <appId> <appSecret> <slug> [metadata] [type] [sessionId] [payload]
 *
 * Positional args:
 *   appId       Application public appId          (required)
 *   appSecret   Plaintext app secret             (required)
 *   slug        Tag slug                         (required)
 *   metadata    JSON object string               (optional, default {})
 *   type        Business event type              (optional, default "event")
 *   sessionId   Session id                       (optional, default "fake-<timestamp>")
 *   payload     JSON object string               (optional, default {})
 *
 * Endpoint override via env: ENDPOINT (default http://localhost:3008/api/v1)
 *
 * Examples:
 *   npm run test:fake-event -- my-app-id my-secret purchase_confirmed
 *   npm run test:fake-event -- my-app-id my-secret account_created '{"plan":"pro"}' signup sess-42 '{"amount":49.99}'
 */

const BASE = (process.env.ENDPOINT || 'http://localhost:3008/api/v1').replace(/\/$/, '');

const [appId, appSecret, slug, metadataArg, typeArg, sessionIdArg, payloadArg] = process.argv.slice(2);

function usage(message) {
    if (message) console.error(message);
    console.error(
        'Usage: npm run test:fake-event -- <appId> <appSecret> <slug> [metadata] [type] [sessionId] [payload]',
    );
    process.exit(1);
}

function parseJsonArg(name, raw, fallback) {
    if (raw == null || raw === '') return fallback;
    let value;
    try {
        value = JSON.parse(raw);
    } catch {
        usage(`${name} is not valid JSON: ${raw}`);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        usage(`${name} must be a JSON object, e.g. '{"key":"value"}'.`);
    }
    return value;
}

if (!appId) usage('appId is required.');
if (!appSecret) usage('appSecret is required.');
if (!slug) usage('slug is required.');

const metadata = parseJsonArg('metadata', metadataArg, {});
const payload = parseJsonArg('payload', payloadArg, {});
const type = typeArg || 'event';
const sessionId = sessionIdArg || `fake-${Date.now()}`;

async function main() {
    const url = `${BASE}/server-events`;
    const body = { type, tagSlug: slug, sessionId, payload, metadata };

    console.log(`→ POST ${url}`);
    console.log(`   appId=${appId} type=${type} tagSlug=${slug} sessionId=${sessionId}`);

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': appId,
                'x-app-secret': appSecret,
            },
            body: JSON.stringify(body),
        });
    } catch (err) {
        console.error(`Request failed: ${err.message}`);
        console.error('Is the backend running on', BASE, '?');
        process.exit(1);
    }

    const text = await res.text();
    if (res.ok) {
        console.log(`✓ ${res.status} ${res.statusText}`);
        if (text) console.log(text);
        console.log('Open the dashboard for this app to see widgets update live (~2s).');
        return;
    }

    console.error(`✗ ${res.status} ${res.statusText}`);
    if (text) console.error(text);
    if (res.status === 401) {
        console.error('Check appId / appSecret.');
    } else if (res.status === 404) {
        console.error(`Tag slug "${slug}" not found for this application.`);
    }
    process.exit(1);
}

main();
