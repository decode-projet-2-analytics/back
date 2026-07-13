#!/usr/bin/env node

/**
 * Seed analytics data so every widget family can be exercised in the dashboard.
 *
 * Creates (idempotent by slug / tunnel name / widget title):
 *   - Tags: buyForm, landing, checkout, purchase
 *   - Tunnel: "Checkout funnel" (landing → checkout → purchase)
 *   - Sessions + type "event" on buyForm with varied metadata (browser, plan, loadMs)
 *   - Funnel step events with drop-off across sessions
 *   - type "mousemove" point batches on two pages
 *   - Sample widgets: events KPI / timeseries / comparison, funnel, mouse heatmap
 *
 * Usage (inside Docker):
 *   docker compose exec backend npm run seed:events -- <applicationId> [eventCount]
 *
 * Local host needs DATABASE_URL + MONGO_URL (compose values use hostname `db`/`mongo`).
 */

const applicationId = Number(process.argv[2]);
const eventCount = Math.max(24, Number(process.argv[3] ?? 72) || 72);

if (!applicationId || Number.isNaN(applicationId)) {
    console.error('Usage: node scripts/seed-events.js <applicationId> [eventCount]');
    process.exit(1);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];
const PLANS = ['free', 'pro', 'enterprise'];
const PAGES = [
    'https://example.com/',
    'https://example.com/pricing',
];

/** Minimal 1×1 JPEG data URL (heatmap background placeholder). */
const TINY_JPEG =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z';

function hoursAgo(hours) {
    return new Date(Date.now() - hours * HOUR_MS);
}

function pick(list, index) {
    return list[index % list.length];
}

async function ensureTag(Tag, { slug, comment }) {
    let tag = await Tag.findOne({ where: { applicationId, slug } });
    if (!tag) {
        tag = await Tag.create({ slug, comment, applicationId });
        console.log(`  + tag ${slug} (#${tag.id})`);
    } else {
        console.log(`  = tag ${slug} (#${tag.id})`);
    }
    return tag;
}

async function ensureTunnel(Tunnel, { name, tagIds }) {
    let tunnel = await Tunnel.findOne({ where: { applicationId, name } });
    if (!tunnel) {
        tunnel = await Tunnel.create({ name, tagIds, applicationId });
        console.log(`  + tunnel "${name}" (#${tunnel.id})`);
    } else {
        await tunnel.update({ tagIds });
        console.log(`  = tunnel "${name}" (#${tunnel.id})`);
    }
    return tunnel;
}

async function ensureWidget(Widget, { type, title, config, position, layout }) {
    const { normalizeWidgetLayout } = require('../lib/widgets/layout');
    let widget = await Widget.findOne({ where: { applicationId, title } });
    const nextConfig = {
        filters: {},
        timeRange: { from: null, to: null, step: '1h' },
        metric: 'count',
        ...config,
        layout: normalizeWidgetLayout(type, layout ?? config?.layout),
    };

    if (!widget) {
        widget = await Widget.create({
            type,
            title,
            applicationId,
            position,
            config: nextConfig,
        });
        console.log(`  + widget [${type}] "${title}" (#${widget.id})`);
    } else {
        await widget.update({ type, config: nextConfig, position });
        console.log(`  = widget [${type}] "${title}" (#${widget.id})`);
    }
    return widget;
}

function buildMousePoints(seed, count = 40) {
    const points = [];
    const baseX = 120 + (seed % 5) * 80;
    const baseY = 180 + (seed % 4) * 60;
    for (let i = 0; i < count; i += 1) {
        points.push({
            x: baseX + Math.sin(i / 3) * 90 + (i % 7) * 12,
            y: baseY + Math.cos(i / 4) * 70 + (i % 5) * 10,
            timestamp: Date.now() - (count - i) * 200,
        });
    }
    return points;
}

async function main() {
    const { connectMongo } = require('../lib/mongo');
    const { registerMongoSyncHooks } = require('../lib/mongo-sync');
    const connection = require('../lib/db');
    const Application = require('../models/application');
    const Session = require('../models/session');
    const Tag = require('../models/tag');
    const Tunnel = require('../models/tunnel');
    const Widget = require('../models/widget');
    const Event = require('../models/event');
    const PageSnapshot = require('../models/mongo-snapshot');

    await connectMongo();
    registerMongoSyncHooks();

    const application = await Application.findByPk(applicationId);
    if (!application) {
        console.error(`Application ${applicationId} not found`);
        process.exit(1);
    }

    console.log(`Seeding application #${applicationId} (${application.name ?? application.appId})`);

    console.log('Tags');
    const buyForm = await ensureTag(Tag, {
        slug: 'buyForm',
        comment: 'Business events (events widgets)',
    });
    const landing = await ensureTag(Tag, {
        slug: 'landing',
        comment: 'Funnel step 1 — landing',
    });
    const checkout = await ensureTag(Tag, {
        slug: 'checkout',
        comment: 'Funnel step 2 — checkout',
    });
    const purchase = await ensureTag(Tag, {
        slug: 'purchase',
        comment: 'Funnel step 3 — purchase',
    });

    console.log('Tunnel');
    const tunnel = await ensureTunnel(Tunnel, {
        name: 'Checkout funnel',
        tagIds: [landing.id, checkout.id, purchase.id],
    });

    const sessionCount = 12;
    console.log(`Sessions (${sessionCount})`);
    const sessions = [];
    for (let i = 0; i < sessionCount; i += 1) {
        const session = await Session.create({
            applicationId,
            startedAt: hoursAgo(36 - i),
            metadata: {
                seed: true,
                sdkSessionId: `seed-${applicationId}-${Date.now()}-${i}`,
            },
        });
        sessions.push(session);
    }

    console.log(`Events type=event on buyForm (${eventCount})`);
    for (let i = 0; i < eventCount; i += 1) {
        const session = sessions[i % sessions.length];
        const browser = pick(BROWSERS, i);
        const plan = pick(PLANS, Math.floor(i / 2));
        const createdAt = hoursAgo((eventCount - i) * (36 / eventCount));

        await Event.create({
            type: 'event',
            payload: { index: i, source: 'seed-events' },
            metadata: {
                seed: true,
                browser,
                plan,
                loadMs: 80 + (i % 25) * 40,
                device: { os: i % 2 === 0 ? 'macos' : 'windows' },
            },
            applicationId,
            sessionId: session.id,
            tagId: buyForm.id,
            createdAt,
            updatedAt: createdAt,
        });
    }

    // Funnel: all sessions hit landing; ~75% checkout; ~40% purchase
    console.log('Funnel step events (landing → checkout → purchase)');
    let funnelEvents = 0;
    for (let i = 0; i < sessions.length; i += 1) {
        const session = sessions[i];
        const t0 = hoursAgo(30 - i * 2);

        await Event.create({
            type: 'event',
            payload: { step: 'landing' },
            metadata: { seed: true, browser: pick(BROWSERS, i) },
            applicationId,
            sessionId: session.id,
            tagId: landing.id,
            createdAt: t0,
            updatedAt: t0,
        });
        funnelEvents += 1;

        if (i % 4 === 3) continue; // drop before checkout

        const t1 = new Date(t0.getTime() + 15 * 60 * 1000);
        await Event.create({
            type: 'event',
            payload: { step: 'checkout' },
            metadata: { seed: true, browser: pick(BROWSERS, i) },
            applicationId,
            sessionId: session.id,
            tagId: checkout.id,
            createdAt: t1,
            updatedAt: t1,
        });
        funnelEvents += 1;

        if (i % 5 === 0 || i % 5 === 1) continue; // drop before purchase

        const t2 = new Date(t1.getTime() + 20 * 60 * 1000);
        await Event.create({
            type: 'event',
            payload: { step: 'purchase' },
            metadata: { seed: true, browser: pick(BROWSERS, i), plan: 'pro' },
            applicationId,
            sessionId: session.id,
            tagId: purchase.id,
            createdAt: t2,
            updatedAt: t2,
        });
        funnelEvents += 1;
    }
    console.log(`  created ${funnelEvents} funnel events`);

    console.log('Mouse-tracking events');
    let mouseBatches = 0;
    for (let i = 0; i < 8; i += 1) {
        const session = sessions[i % sessions.length];
        const url = pick(PAGES, i);
        const createdAt = hoursAgo(i * 3 + 1);
        await Event.create({
            type: 'mousemove',
            payload: {
                url,
                points: buildMousePoints(i, 50),
                docSize: { width: 1440, height: 2200 },
                viewport: { width: 1440, height: 900, dpr: 1 },
            },
            metadata: { seed: true },
            applicationId,
            sessionId: session.id,
            tagId: buyForm.id,
            createdAt,
            updatedAt: createdAt,
        });
        mouseBatches += 1;
    }
    console.log(`  created ${mouseBatches} mousemove batches`);

    console.log('Page snapshots (heatmap background)');
    for (const url of PAGES) {
        await PageSnapshot.findOneAndUpdate(
            { applicationId, url },
            {
                $set: {
                    image: TINY_JPEG,
                    width: 1440,
                    height: 900,
                    capturedAt: new Date(),
                },
            },
            { upsert: true },
        );
        console.log(`  = snapshot ${url}`);
    }

    console.log('Sample widgets');
    await ensureWidget(Widget, {
        type: 'events',
        title: '[seed] Events KPI — buyForm',
        position: 0,
        layout: { x: 0, y: 0, w: 4, h: 3 },
        config: {
            tagId: buyForm.id,
            visualization: 'nombre',
            series: [{ name: 'All', filters: [] }],
            timeRange: { from: null, to: null, step: '1h' },
            metric: 'count',
        },
    });

    await ensureWidget(Widget, {
        type: 'events',
        title: '[seed] Events comparison — browser',
        position: 1,
        layout: { x: 4, y: 0, w: 4, h: 4 },
        config: {
            tagId: buyForm.id,
            visualization: 'bar',
            series: [
                { name: 'Chrome', filters: [{ key: 'browser', op: 'eq', value: 'chrome' }] },
                { name: 'Firefox', filters: [{ key: 'browser', op: 'eq', value: 'firefox' }] },
            ],
            timeRange: { from: null, to: null, step: '1h' },
            metric: 'count',
        },
    });

    await ensureWidget(Widget, {
        type: 'events',
        title: '[seed] Events timeseries — buyForm',
        position: 2,
        layout: { x: 8, y: 0, w: 4, h: 4 },
        config: {
            tagId: buyForm.id,
            visualization: 'line',
            series: [
                { name: 'All', filters: [] },
                { name: 'Pro plan', filters: [{ key: 'plan', op: 'eq', value: 'pro' }] },
            ],
            timeRange: {
                from: new Date(Date.now() - 2 * DAY_MS).toISOString(),
                to: null,
                step: '1h',
            },
            metric: 'count',
        },
    });

    await ensureWidget(Widget, {
        type: 'funnel',
        title: '[seed] Funnel — Checkout',
        position: 3,
        layout: { x: 0, y: 3, w: 12, h: 4 },
        config: {
            tunnelId: tunnel.id,
            timeRange: { from: null, to: null, step: '1h' },
            metric: 'count',
        },
    });

    await ensureWidget(Widget, {
        type: 'mouse_heatmap',
        title: '[seed] Mouse heatmap',
        position: 4,
        layout: { x: 0, y: 7, w: 12, h: 5 },
        config: {
            mouse: { period: '7d', page: PAGES[0] },
            timeRange: { from: null, to: null, step: '1h' },
            metric: 'count',
        },
    });

    console.log('\nDone. Open the dashboard for this application.');
    console.log('Tips:');
    console.log('  - Events KPI / comparison / timeseries → tag buyForm + metadata filters');
    console.log('  - Funnel → tunnel "Checkout funnel"');
    console.log('  - Mouse heatmap → pages example.com (+ /pricing)');
    console.log('  - Filter examples: browser eq chrome | plan eq pro | loadMs gt 200');

    await connection.close();
    process.exit(0);
}

main().catch(async (error) => {
    console.error(error);
    try {
        const connection = require('../lib/db');
        await connection.close();
    } catch {
        // ignore
    }
    process.exit(1);
});
