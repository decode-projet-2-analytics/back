const { mongoose } = require('./mongo');

const mirrorOptions = { timestamps: true, strict: false };

function defineMirror(name, collection) {
    if (mongoose.models[name]) return mongoose.models[name];
    return mongoose.model(
        name,
        new mongoose.Schema({ postgresId: { type: Number, required: true, unique: true } }, mirrorOptions),
        collection,
    );
}

const UserMirror = defineMirror('UserMirror', 'sync_users');
const ApplicationMirror = defineMirror('ApplicationMirror', 'sync_applications');
const TagMirror = defineMirror('TagMirror', 'sync_tags');
const TunnelMirror = defineMirror('TunnelMirror', 'sync_tunnels');
const WidgetMirror = defineMirror('WidgetMirror', 'sync_widgets');
const SessionMirror = defineMirror('SessionMirror', 'sync_sessions');
const EventMirror = defineMirror('EventMirror', 'sync_events');

module.exports = {
    UserMirror,
    ApplicationMirror,
    TagMirror,
    TunnelMirror,
    WidgetMirror,
    SessionMirror,
    EventMirror,
};
