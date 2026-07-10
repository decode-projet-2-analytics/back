#!/usr/bin/env node

const applicationId = Number(process.argv[2]);
const eventCount = Number(process.argv[3] ?? 42);

if (!applicationId || Number.isNaN(applicationId)) {
    console.error('Usage: node scripts/seed-events.js <applicationId> [eventCount]');
    process.exit(1);
}

async function main() {
    const { connectMongo } = require('../lib/mongo');
    const { registerMongoSyncHooks } = require('../lib/mongo-sync');
    const Application = require('../models/application');
    const Session = require('../models/session');
    const Tag = require('../models/tag');
    const Event = require('../models/event');

    await connectMongo();
    registerMongoSyncHooks();

    const application = await Application.findByPk(applicationId);
    if (!application) {
        console.error(`Application ${applicationId} not found`);
        process.exit(1);
    }

    let tag = await Tag.findOne({ where: { applicationId } });
    if (!tag) {
        tag = await Tag.create({
            slug: 'seed_tag',
            comment: 'Seed tag',
            applicationId,
        });
        console.log(`Created tag #${tag.id}`);
    }

    const sessionCount = 7;
    const sessions = [];

    for (let i = 0; i < sessionCount; i += 1) {
        sessions.push(
            await Session.create({
                applicationId,
                metadata: { seed: true },
            })
        );
    }

    console.log(`Created ${sessions.length} sessions`);

    const types = ['page_view', 'click', 'add_to_cart'];

    for (let i = 0; i < eventCount; i += 1) {
        const session = sessions[i % sessions.length];
        await Event.create({
            type: types[i % types.length],
            payload: { index: i },
            metadata: { seed: true },
            applicationId,
            sessionId: session.id,
            tagId: tag.id,
        });
    }

    console.log(`Created ${eventCount} events for application #${applicationId}`);
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
