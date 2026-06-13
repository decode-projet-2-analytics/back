const User = require('./user');
const Application = require('./application');
const Tag = require('./tag');
const Tunnel = require('./tunnel');

User.hasMany(Application, { foreignKey: 'ownerId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Application.hasMany(Tag, { foreignKey: 'applicationId', as: 'tags' });
Tag.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Application.hasMany(Tunnel, { foreignKey: 'applicationId', as: 'tunnels' });
Tunnel.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });
