import { Router } from 'express';
import { notFound } from '../../lib/errors';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.get('/', (_req, res) => {
    res.json({ status: 'ok', version: 'v1' });
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
w