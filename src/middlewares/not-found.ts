import { Request, Response, NextFunction } from 'express';
import { notFound } from '../lib/errors';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
    next(notFound());
}
