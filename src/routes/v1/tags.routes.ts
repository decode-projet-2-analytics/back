import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { notImplemented } from '../../lib/errors';

const router = Router();

router.use(authenticate());

router.get('/', (_req, _res, next) => next(notImplemented()));
router.post('/', (_req, _res, next) => next(notImplemented()));
router.patch('/:id', (_req, _res, next) => next(notImplemented()));
router.delete('/:id', (_req, _res, next) => next(notImplemented()));

export default router;
