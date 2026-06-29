const { Router } = require('express');

const authRouter = require('../security');
const adminRouter = require('../admin');
const usersRouter = require('../users');
const applicationsRouter = require('../applications');
const tagsRouter = require('../tags');
const tunnelsRouter = require('../tunnels');
const widgetsRouter = require('../widgets');
const sessionsRouter = require('../sessions');
const eventsRouter = require('../events');
const healthRouter = require('./health');

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/users', usersRouter);
router.use('/applications', applicationsRouter);
router.use('/tags', tagsRouter);
router.use('/tunnels', tunnelsRouter);
router.use('/widgets', widgetsRouter);
router.use('/sessions', sessionsRouter);
router.use('/events', eventsRouter);

module.exports = router;
