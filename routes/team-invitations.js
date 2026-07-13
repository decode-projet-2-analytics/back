const { Router } = require('express');

const ApplicationMember = require('../models/application-member');
const ApplicationInvitation = require('../models/application-invitation');
const User = require('../models/user');
const checkAuth = require('../middlewares/check-auth');
const { hashInvitationToken } = require('../lib/team-invitations');

const router = new Router();

router.post('/:token/accept', checkAuth(), async (req, res, next) => {
    try {
        const tokenHash = hashInvitationToken(req.params.token);
        const invitation = await ApplicationInvitation.findOne({
            where: {
                tokenHash,
                status: 'pending',
            },
        });

        if (!invitation) {
            return res.status(404).json({ error: { message: 'Invitation introuvable' } });
        }

        if (invitation.expiresAt.getTime() < Date.now()) {
            invitation.status = 'expired';
            await invitation.save({ fields: ['status'] });
            return res.status(410).json({ error: { message: 'Invitation expirée' } });
        }

        const user = await User.findByPk(req.user.id, { attributes: ['id', 'email'] });
        if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({ error: { message: 'Cette invitation est associée à un autre email' } });
        }

        const [member] = await ApplicationMember.findOrCreate({
            where: {
                applicationId: invitation.applicationId,
                userId: user.id,
            },
            defaults: {
                role: invitation.role,
                status: 'active',
                invitedBy: invitation.invitedBy,
            },
        });

        if (member.status !== 'active' || member.role !== invitation.role) {
            member.status = 'active';
            member.role = invitation.role;
            member.invitedBy = invitation.invitedBy;
            await member.save({ fields: ['status', 'role', 'invitedBy'] });
        }

        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save({ fields: ['status', 'acceptedAt'] });

        return res.json({ applicationId: invitation.applicationId, member });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
