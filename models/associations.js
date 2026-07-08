const User = require('./user');
const Application = require('./application');
const Tag = require('./tag');
const Tunnel = require('./tunnel');
const Widget = require('./widget');
const Session = require('./session');
const Event = require('./event');
const Conversation = require('./conversation');
const Message = require('./message');

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

Application.hasMany(Conversation, { foreignKey: 'applicationId', as: 'conversations' });
Conversation.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

User.hasMany(Conversation, { foreignKey: 'userId', as: 'supportConversations' });
Conversation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
