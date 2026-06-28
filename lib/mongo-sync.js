const User = require('../models/user');
const Application = require('../models/application');
const Tag = require('../models/tag');
const Tunnel = require('../models/tunnel');
const Widget = require('../models/widget');
const Session = require('../models/session');
const Event = require('../models/event');
const {
    UserMirror,
    ApplicationMirror,
    TagMirror,
    TunnelMirror,
    WidgetMirror,
    SessionMirror,
    EventMirror,
} = require('./mongo-models');

function toMirrorDoc(instance) {
    const doc = instance.toJSON();
    doc.postgresId = instance.id;
    return doc;
}

async function upsertMirror(MirrorModel, instance) {
    const doc = toMirrorDoc(instance);
    await MirrorModel.findOneAndUpdate(
        { postgresId: instance.id },
        { $set: doc },
        { upsert: true, returnDocument: 'after' },
    );
}

async function deleteMirror(MirrorModel, instance) {
    await MirrorModel.deleteOne({ postgresId: instance.id });
}

function registerModelSync(SequelizeModel, MirrorModel) {
    SequelizeModel.addHook('afterCreate', async (instance) => {
        try {
            await upsertMirror(MirrorModel, instance);
        } catch (error) {
            console.error(`[mongo-sync] afterCreate ${SequelizeModel.name}:`, error.message);
        }
    });

    SequelizeModel.addHook('afterUpdate', async (instance) => {
        try {
            await upsertMirror(MirrorModel, instance);
        } catch (error) {
            console.error(`[mongo-sync] afterUpdate ${SequelizeModel.name}:`, error.message);
        }
    });

    SequelizeModel.addHook('afterDestroy', async (instance) => {
        try {
            await deleteMirror(MirrorModel, instance);
        } catch (error) {
            console.error(`[mongo-sync] afterDestroy ${SequelizeModel.name}:`, error.message);
        }
    });
}

function registerMongoSyncHooks() {
    registerModelSync(User, UserMirror);
    registerModelSync(Application, ApplicationMirror);
    registerModelSync(Tag, TagMirror);
    registerModelSync(Tunnel, TunnelMirror);
    registerModelSync(Widget, WidgetMirror);
    registerModelSync(Session, SessionMirror);
    registerModelSync(Event, EventMirror);
    console.log('Mongo sync hooks registered (Postgres → Mongo)');
}

module.exports = { registerMongoSyncHooks };
