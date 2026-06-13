const User = require('./user');
const Site = require('./site');
const Tag = require('./tag');
const Tunnel = require('./tunnel');

User.hasMany(Site, { foreignKey: 'ownerId', as: 'sites' });
Site.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Site.hasMany(Tag, { foreignKey: 'siteId', as: 'tags' });
Tag.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });

Site.hasMany(Tunnel, { foreignKey: 'siteId', as: 'tunnels' });
Tunnel.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
