const User = require('./user');
const Application = require('./application');
const Tag = require('./tag');
const Tunnel = require('./tunnel');
const Widget = require('./widget');
const Session = require('./session');
const Event = require('./event');

User.hasMany(Application, { foreignKey: 'ownerId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Application.hasMany(Tag, { foreignKey: 'applicationId', as: 'tags' });
Tag.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Application.hasMany(Tunnel, { foreignKey: 'applicationId', as: 'tunnels' });
Tunnel.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Application.hasMany(Widget, { foreignKey: 'applicationId', as: 'widgets' });
Widget.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Application.hasMany(Session, { foreignKey: 'applicationId', as: 'sessions' });
Session.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Application.hasMany(Event, { foreignKey: 'applicationId', as: 'events' });
Event.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Tunnel.hasMany(Tag, { foreignKey: 'tunnelId', sourceKey: 'tunnelId', as: 'tags' });
Tag.belongsTo(Tunnel, { foreignKey: 'tunnelId', targetKey: 'tunnelId', as: 'tunnel' });

Session.hasMany(Event, { foreignKey: 'sessionId', as: 'events' });
Event.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

Tag.hasMany(Event, { foreignKey: 'tagId', as: 'events' });
Event.belongsTo(Tag, { foreignKey: 'tagId', as: 'tag' });
