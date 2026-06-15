const express = require('express');
const middlewareError = require('./middlewares/error-handler');
const defaultRouter = require('./routes/default');
const usersRouter = require('./routes/users');
const applicationsRouter = require('./routes/applications');
const tagsRouter = require('./routes/tags');
const tunnelsRouter = require('./routes/tunnels');
const widgetsRouter = require('./routes/widgets');
const sessionsRouter = require('./routes/sessions');
const eventsRouter = require('./routes/events');
const app = express();

const PORT = process.env.PORT || 3000;

// app.use(middlewareParseBody);
app.use(express.json());
app.use(express.urlencoded());

app.use(defaultRouter);
app.use(require('./routes/security'));
app.use('/users', usersRouter);
app.use('/applications', applicationsRouter);
app.use('/tags', tagsRouter);
app.use('/tunnels', tunnelsRouter);
app.use('/widgets', widgetsRouter);
app.use('/sessions', sessionsRouter);
app.use('/events', eventsRouter);

app.use(middlewareError);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});