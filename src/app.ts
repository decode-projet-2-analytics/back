import express from 'express';
import v1Router from './routes/v1';
import { notFoundHandler } from './middlewares/not-found';
import { errorHandler } from './middlewares/error-handler';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', v1Router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
