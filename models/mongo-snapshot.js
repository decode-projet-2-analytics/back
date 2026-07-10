const { mongoose } = require('../lib/mongo');

/**
 * Latest page screenshot per (application, url), captured automatically by the
 * SDK and used as the background image under the mouse heatmap.
 *
 * Kept in Mongo (not Postgres) because the JPEG data URL is large; only the
 * most recent snapshot per page is retained (upsert on ingest).
 */
const snapshotSchema = new mongoose.Schema(
    {
        applicationId: { type: Number, required: true },
        url: { type: String, required: true },
        image: { type: String, required: true }, // JPEG data URL
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        capturedAt: { type: Date },
    },
    { timestamps: true, collection: 'page_snapshots' },
);

snapshotSchema.index({ applicationId: 1, url: 1 }, { unique: true });

module.exports =
    mongoose.models.PageSnapshot || mongoose.model('PageSnapshot', snapshotSchema);
