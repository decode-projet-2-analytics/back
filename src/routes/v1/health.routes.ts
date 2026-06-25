import { Router } from 'express';
import { notFound } from '../../lib/errors';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { mongoose } from '../../lib/mongo';

const router = Router();

router.get('/', (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;

    res.status(mongoReady ? 200 : 503).json({
        status: mongoReady ? 'ok' : 'degraded',
        version: 'v1',
        mongo: mongoReady ? 'connected' : 'disconnected',
    });
});

router.get('/test-error', (_req, _res, next) => {
    next(notFound('Health resource not found'));
});

router.get('/protected', authenticate(), (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
});

router.get('/admin', authenticate(), authorize('admin'), (req, res) => {
    res.json({ message: 'Admin access granted', user: req.user });
});

export default router;
