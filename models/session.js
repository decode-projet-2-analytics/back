const mongoose = require('../lib/mongo');

// TODO: vérifier ça
const replayActionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
    },
    x: Number,
    y: Number,
    timestamp: Date,
    target: String,
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    siteId: {
        type: String,
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: Date,
    metadata: {
        os: String,
        location: String,
        userAgent: String,
        referrer: String,
    },
    replay: {
        type: [replayActionSchema],
        default: [],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
