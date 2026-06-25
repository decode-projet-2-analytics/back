import { Router } from 'express';
import { notImplemented } from '../../lib/errors';

const router = Router();

router.post('/register', (_req, _res, next) => next(notImplemented()));
router.post('/login', (_req, _res, next) => next(notImplemented()));
router.post('/refresh', (_req, _res, next) => next(notImplemented()));
router.post('/logout', (_req, _res, next) => next(notImplemented()));

export default router;
