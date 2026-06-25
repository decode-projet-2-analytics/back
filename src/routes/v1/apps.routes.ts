import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { notImplemented } from '../../lib/errors';

const router = Router();

router.use(authenticate());

router.get('/', (_req, _res, next) => next(notImplemented()));
router.post('/', (_req, _res, next) => next(notImplemented()));
router.post('/:id/secret', (_req, _res, next) => next(notImplemented()));
router.delete('/:id/secret', (_req, _res, next) => next(notImplemented()));
router.patch('/:id/cors', (_req, _res, next) => next(notImplemented()));
router.post('/:id/members', (_req, _res, next) => next(notImplemented()));
router.delete('/:id/members/:userId', (_req, _res, next) => next(notImplemented()));

export default router;
