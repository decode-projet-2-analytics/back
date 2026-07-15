const RESOURCE_WRITE_ROLES = {
    tags: { create: 'admin', patch: 'admin', delete: 'admin' },
    tunnels: { create: 'admin', patch: 'admin', delete: 'admin' },
    widgets: { create: 'admin', patch: 'admin', delete: 'admin' },
    sessions: { patch: 'owner', delete: 'owner' },
};

module.exports = { RESOURCE_WRITE_ROLES };
