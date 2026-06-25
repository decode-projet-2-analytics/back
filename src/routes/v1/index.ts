import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import appsRouter from './apps.routes';
import eventsRouter from './events.routes';
import serverEventsRouter from './server-events.routes';
import tagsRouter from './tags.routes';
import tunnelsRouter from './tunnels.routes';
import widgetsRouter from './widgets.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/apps', appsRouter);
router.use('/events', eventsRouter);
router.use('/server-events', serverEventsRouter);
router.use('/tags', tagsRouter);
router.use('/tunnels', tunnelsRouter);
router.use('/widgets', widgetsRouter);

export default router;
