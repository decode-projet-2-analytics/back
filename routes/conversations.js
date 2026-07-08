const createCrudRouter = require('../lib/create-crud-router');
const checkAuth = require('../middlewares/check-auth');
const checkRole = require('../middlewares/check-role');
const { ownershipScope, assertApplicationOwnership } = require('../lib/ownership-scope');
const { loadConversation } = require('../lib/socket/chat/access-conversation');
const { serializeMessage } = require('../lib/socket/chat/serialize');
const { emitConversationStatus } = require('../lib/socket/chat');
const Application = require('../models/application');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

const APPLICATION_ATTRS = ['id', 'name', 'appId'];
const USER_ATTRS = ['id', 'firstname', 'lastname', 'email', 'companyName', 'contactPhone', 'websiteUrl', 'status'];

const conversationInclude = {
    model: Application,
    as: 'application',
    attributes: APPLICATION_ATTRS,
};

const userInclude = {
    model: User,
    as: 'user',
    attributes: USER_ATTRS,
};

const messageInclude = [{
    model: User,
    as: 'sender',
    attributes: ['id', 'firstname'],
}];

const router = createCrudRouter({
    model: Conversation,
    methods: ['list', 'create'],
    auth: {
        list: checkAuth(),
        create: checkAuth(),
    },
    scope: ownershipScope,
    allowedFields: {
        create: ['applicationId'],
    },
    queryFields: ['applicationId', 'status'],
    hooks: {
        beforeCreate: async (req, body) => {
            const applicationId = Number(body.applicationId);

            if (!applicationId) {
                const error = new Error('Champs invalides');
                error.name = 'SequelizeValidationError';
                error.errors = [{ path: 'applicationId', message: 'required' }];
                throw error;
            }

            try {
                await assertApplicationOwnership(req, applicationId);
            } catch {
                const error = new Error('Application not found');
                error.status = 404;
                throw error;
            }

            return {
                applicationId,
                userId: req.user.id,
            };
        },
        listOptions: () => ({
            include: [conversationInclude],
            order: [['updatedAt', 'DESC'], ['id', 'DESC']],
        }),
    },
});

router.get('/:conversationId', checkAuth(), loadConversation, async (req, res, next) => {
    try {
        const full = await Conversation.findByPk(req.conversation.id, {
            include: [conversationInclude, userInclude],
        });

        return res.json(full);
    } catch (error) {
        return next(error);
    }
});

router.get('/:conversationId/messages', checkAuth(), loadConversation, async (req, res, next) => {
    try {
        const messages = await Message.findAll({
            where: { conversationId: req.conversation.id },
            include: messageInclude,
            order: [['createdAt', 'ASC']],
        });

        return res.json(
            messages.map((message) => serializeMessage(message, req.params.conversationId)),
        );
    } catch (error) {
        return next(error);
    }
});

router.patch('/:conversationId', checkAuth(), checkRole('Admin'), loadConversation, async (req, res, next) => {
    try {
        const { status } = req.body ?? {};

        if (status !== 'closed') {
            return res.status(400).json({ message: 'Invalid status' });
        }

        if (req.conversation.status === 'closed') {
            return res.status(409).json({ message: 'Conversation already closed' });
        }

        await req.conversation.update({ status: 'closed' });

        emitConversationStatus(req.params.conversationId, 'closed');

        const full = await Conversation.findByPk(req.conversation.id, {
            include: [conversationInclude, userInclude],
        });

        return res.json(full);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
