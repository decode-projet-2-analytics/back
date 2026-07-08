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

const { PROBLEM_TYPE_SET, DEFAULT_PROBLEM_TYPE } = require('../lib/socket/chat/chat-problem-types');
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

function conversationScope(req) {
    if (req.query.all === 'true' && req.user?.role === 'Admin') {
        return {};
    }

    const scope = { userId: req.user.id };

    if (req.user?.role !== 'Admin') {
        Object.assign(scope, ownershipScope(req));
    }

    return scope;
}

const router = createCrudRouter({
    model: Conversation,
    methods: ['list', 'create'],
    auth: {
        list: checkAuth(),
        create: checkAuth(),
    },
    scope: conversationScope,
    allowedFields: {
        create: ['applicationId', 'problemType', 'message'],
    },
    queryFields: ['applicationId', 'status'],
    hooks: {
        beforeCreate: async (req, body) => {
            const applicationId = Number(body.applicationId);
            const problemType = body.problemType;
            const message = typeof body.message === 'string' ? body.message.trim() : '';

            if (!applicationId) {
                const error = new Error('Champs invalides');
                error.name = 'SequelizeValidationError';
                error.errors = [{ path: 'applicationId', message: 'required' }];
                throw error;
            }

            if (!PROBLEM_TYPE_SET.has(problemType)) {
                const error = new Error('Champs invalides');
                error.name = 'SequelizeValidationError';
                error.errors = [{ path: 'problemType', message: 'invalid' }];
                throw error;
            }

            if (!message) {
                const error = new Error('Champs invalides');
                error.name = 'SequelizeValidationError';
                error.errors = [{ path: 'message', message: 'required' }];
                throw error;
            }

            if (req.user.role === 'Admin') {
                const application = await Application.findByPk(applicationId);
                if (!application) {
                    const error = new Error('Application not found');
                    error.status = 404;
                    throw error;
                }
            } else {
                try {
                    await assertApplicationOwnership(req, applicationId);
                } catch {
                    const error = new Error('Application not found');
                    error.status = 404;
                    throw error;
                }
            }

            req.conversationInitialMessage = message;

            return {
                applicationId,
                userId: req.user.id,
                problemType,
            };
        },
        afterCreate: async (req, conversation) => {
            const content = req.conversationInitialMessage;
            if (!content) return;

            const now = new Date();
            await Message.create({
                conversationId: conversation.id,
                senderId: req.user.id,
                content,
            });

            await conversation.update({ lastMessageAt: now, updatedAt: now });
        },
        listOptions: (req) => ({
            include:
                req.query.all === 'true' && req.user?.role === 'Admin'
                    ? [conversationInclude, userInclude]
                    : [conversationInclude],
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
