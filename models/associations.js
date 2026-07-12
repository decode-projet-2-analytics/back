const User = require('./user');
const Application = require('./application');
const Tag = require('./tag');
const Tunnel = require('./tunnel');
const Widget = require('./widget');
const Session = require('./session');
const Event = require('./event');
const Conversation = require('./conversation');
const Message = require('./message');
const ApplicationMember = require('./application-member');
const ApplicationInvitation = require('./application-invitation');

User.hasMany(Application, { foreignKey: 'ownerId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Application.hasMany(ApplicationMember, { foreignKey: 'applicationId', as: 'members' });
ApplicationMember.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });
User.hasMany(ApplicationMember, { foreignKey: 'userId', as: 'applicationMemberships' });
ApplicationMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ApplicationMember, { foreignKey: 'invitedBy', as: 'sentApplicationMemberships' });
ApplicationMember.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });

Application.hasMany(ApplicationInvitation, { foreignKey: 'applicationId', as: 'invitations' });
ApplicationInvitation.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });
User.hasMany(ApplicationInvitation, { foreignKey: 'invitedBy', as: 'sentApplicationInvitations' });
ApplicationInvitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });

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
