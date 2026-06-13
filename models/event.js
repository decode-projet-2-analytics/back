const mongoose = require('../lib/mongo');

// TODO: vérifier ça
const eventSchema = new mongoose.Schema({
    applicationId: {
        type: String,
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        index: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
    },
    metadata: {
        os: String,
        location: String,
        userAgent: String,
        referrer: String,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
