import { Router } from 'express';
import { notImplemented } from '../../lib/errors';

const router = Router();

router.post('/', (_req, _res, next) => next(notImplemented()));

export default router;
