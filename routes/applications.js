const crypto = require('crypto');
const { Op } = require('sequelize');
const createCrudRouter = require('../lib/create-crud-router');
const Application = require('../models/application');
const ApplicationMember = require('../models/application-member');
const ApplicationInvitation = require('../models/application-invitation');
const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const {
    accessibleApplicationIdWhere,
    assertApplicationRole,
    getApplicationRole,
} = require('../lib/application-access');
const {
    normalizeInvitationEmails,
    createInvitationTokenPair,
    buildInvitationExpiresAt,
} = require('../lib/team-invitations');
const { sendTeamInvitationEmail } = require('../lib/mail');

const TEAM_ROLES = ['admin', 'member', 'viewer'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const scope = (req) => accessibleApplicationIdWhere(req.user);

function validateTeamRole(role) {
    return TEAM_ROLES.includes(role) ? role : null;
}

function buildAcceptUrl(token) {
    return `${FRONTEND_URL.replace(/\/$/, '')}/team-invitations/${token}`;
}

function requireApplicationRole(requiredRole) {
    return async (req, res, next) => {
        try {
            await assertApplicationRole(req, req.params.id, requiredRole);
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

async function assertCanCreateApplication(req) {
    if (req.user.role === 'Admin') return;

    const [ownedCount, membershipCount] = await Promise.all([
        Application.count({ where: { ownerId: req.user.id } }),
        ApplicationMember.count({
            where: {
                userId: req.user.id,
                status: 'active',
            },
        }),
    ]);

    if (membershipCount > 0 && ownedCount === 0) {
        const error = new Error('Application team members cannot create applications');
        error.status = 403;
        throw error;
    }
}

const router = createCrudRouter({
    model: Application,
    auth: {
        list: checkAuth(),
        get: checkAuth(),
        create: checkAuth(),
        put: [checkAuth(), requireApplicationRole('admin')],
        patch: [checkAuth(), requireApplicationRole('admin')],
        delete: [checkAuth(), requireApplicationRole('owner')],
    },
    allowedFields: {
        create: ['name', 'allowedUrls'],
        put: ['name', 'allowedUrls'],
        patch: ['name', 'allowedUrls'],
    },
    queryFields: ['ownerId', 'name', 'allowedUrls'],
    scope,
    hooks: {
        beforeCreate: async (req, body) => {
            await assertCanCreateApplication(req);
            return {
                ...body,
                ownerId: req.user.id,
            };
        },
        beforeUpdate: async (req, body) => {
            await assertApplicationRole(req, req.params.id, 'admin');
            return body;
        },
    },
});

router.get('/:id/team', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'viewer');

        const application = await Application.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'email', 'firstname', 'lastname'],
                },
            ],
        });

        if (!application) return res.sendStatus(404);

        const members = await ApplicationMember.findAll({
            where: {
                applicationId: req.params.id,
                status: 'active',
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'firstname', 'lastname'],
                },
            ],
            order: [['createdAt', 'ASC'], ['id', 'ASC']],
        });

        const owner = application.owner;
        return res.json([
            {
                id: `owner-${owner.id}`,
                applicationId: application.id,
                userId: owner.id,
                role: 'owner',
                status: 'active',
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
                user: owner,
            },
            ...members,
        ]);
    } catch (error) {
        return next(error);
    }
});

router.get('/:id/role', checkAuth(), async (req, res, next) => {
    try {
        const role = await getApplicationRole(req.user, req.params.id);
        if (!role) return res.sendStatus(404);
        return res.json({ role });
    } catch (error) {
        return next(error);
    }
});

router.get('/:id/invitations', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const invitations = await ApplicationInvitation.findAll({
            where: {
                applicationId: req.params.id,
                status: 'pending',
            },
            include: [
                {
                    model: User,
                    as: 'inviter',
                    attributes: ['id', 'email', 'firstname', 'lastname'],
                },
            ],
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
        });

        return res.json(invitations);
    } catch (error) {
        return next(error);
    }
});

router.post('/:id/invitations', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const role = validateTeamRole(req.body?.role ?? 'member');
        if (!role) {
            return res.status(422).json({ error: { message: 'Role invalide' } });
        }

        let normalized;
        try {
            normalized = normalizeInvitationEmails(req.body?.emails);
        } catch (error) {
            return res.status(422).json({ error: { message: error.message } });
        }

        const application = await Application.findByPk(req.params.id);
        if (!application) return res.sendStatus(404);

        const activeUsers = await User.findAll({
            where: {
                email: { [Op.in]: normalized.valid },
            },
            attributes: ['id', 'email'],
        });
        const usersByEmail = new Map(activeUsers.map((user) => [user.email.toLowerCase(), user]));

        const existingMembers = await ApplicationMember.findAll({
            where: {
                applicationId: application.id,
                status: 'active',
                userId: { [Op.in]: activeUsers.map((user) => user.id) },
            },
            include: [{ model: User, as: 'user', attributes: ['email'] }],
        });
        const memberEmails = new Set(existingMembers.map((member) => member.user.email.toLowerCase()));

        const existingInvitations = await ApplicationInvitation.findAll({
            where: {
                applicationId: application.id,
                email: { [Op.in]: normalized.valid },
                status: 'pending',
            },
            attributes: ['email'],
        });
        const pendingEmails = new Set(existingInvitations.map((invitation) => invitation.email.toLowerCase()));

        const result = {
            sent: [],
            alreadyInvited: [],
            alreadyMembers: [],
            invalid: normalized.invalid,
        };

        for (const email of normalized.valid) {
            if (application.ownerId === usersByEmail.get(email)?.id || memberEmails.has(email)) {
                result.alreadyMembers.push(email);
                continue;
            }

            if (pendingEmails.has(email)) {
                result.alreadyInvited.push(email);
                continue;
            }

            const { token, tokenHash } = createInvitationTokenPair();
            const expiresAt = buildInvitationExpiresAt();

            await ApplicationInvitation.create({
                applicationId: application.id,
                email,
                role,
                status: 'pending',
                tokenHash,
                invitedBy: req.user.id,
                expiresAt,
            });

            try {
                await sendTeamInvitationEmail({
                    email,
                    role,
                    applicationName: application.name,
                    inviterEmail: req.user.email,
                    acceptUrl: buildAcceptUrl(token),
                    expiresAt,
                });
            } catch (error) {
                await ApplicationInvitation.update(
                    { status: 'revoked' },
                    {
                        where: { tokenHash },
                        fields: ['status'],
                    }
                );
                return res.status(502).json({
                    error: {
                        message: 'Invitation créée mais email non envoyé',
                        email,
                        details: error.message,
                    },
                });
            }

            result.sent.push(email);
        }

        return res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
});

router.patch('/:id/members/:memberId', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const role = validateTeamRole(req.body?.role);
        if (!role) {
            return res.status(422).json({ error: { message: 'Role invalide' } });
        }

        const member = await ApplicationMember.findOne({
            where: {
                id: req.params.memberId,
                applicationId: req.params.id,
                status: 'active',
            },
        });

        if (!member) return res.sendStatus(404);

        member.role = role;
        await member.save({ fields: ['role'] });

        return res.json(member);
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id/members/:memberId', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const [updated] = await ApplicationMember.update(
            { status: 'revoked' },
            {
                where: {
                    id: req.params.memberId,
                    applicationId: req.params.id,
                    status: 'active',
                },
                fields: ['status'],
            }
        );

        if (!updated) return res.sendStatus(404);
        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id/invitations/:invitationId', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const [updated] = await ApplicationInvitation.update(
            { status: 'revoked' },
            {
                where: {
                    id: req.params.invitationId,
                    applicationId: req.params.id,
                    status: 'pending',
                },
                fields: ['status'],
            }
        );

        if (!updated) return res.sendStatus(404);
        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
});

router.post('/:id/secret', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const application = await Application.findOne({
            where: { ...scope(req), id: req.params.id },
        });

        if (!application) return res.sendStatus(404);

        const plainSecret = crypto.randomBytes(32).toString('hex');
        application.appSecret = plainSecret;
        await application.save({ fields: ['appSecret'] });

        return res.status(201).json({
            id: application.id,
            appId: application.appId,
            appSecret: plainSecret,
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id/secret', checkAuth(), async (req, res, next) => {
    try {
        await assertApplicationRole(req, req.params.id, 'admin');

        const [nbUpdated] = await Application.update(
            { appSecret: null },
            {
                where: { ...scope(req), id: req.params.id },
                individualHooks: true,
                fields: ['appSecret'],
            }
        );

        if (!nbUpdated) return res.sendStatus(404);

        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
